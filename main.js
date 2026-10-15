// Lofi Rooms: input, decorating tools, things you can tap, sound, saving, the
// list of rooms and the little "cozy moments" journal.
// In the Android app, storage.js restores saves before boot and mirrors writes to SQLite.

function startLofiRooms() {
  const { HC, CAT, GROUPS, WALLS, FLOORS, WALL_COLORS, PRESETS, CATS, fp } = LR;
  const Sound = window.LofiSound;
  const $ = s => document.querySelector(s);
  const put = (k, v) => {
    if (window.Store) window.Store.set(k, v);
    else try { localStorage.setItem(k, v); } catch (e) { /* private mode */ }
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { put(k, JSON.stringify(v)); },
    del(k) { if (window.Store) window.Store.del(k); else try { localStorage.removeItem(k); } catch (e) {} },
  };

  // ---------------------------------------------------------------
  // Cozy moments
  const MOMENTS = [
    ['light', 'First light', 'Switched on a lamp'],
    ['lofi', 'Lofi hour', 'Put a record on'],
    ['rain', 'Rainy day', 'Listened to the rain'],
    ['nightowl', 'Night owl', 'Lamps glowing after dark'],
    ['purr', 'Purr', 'Petted a cat'],
    ['catnap', 'Cat nap', 'A cat curled up in its bed'],
    ['perch', 'High ground', 'A cat hopped up on the furniture'],
    ['tea', 'Tea time', 'Sipped something warm'],
    ['green', 'Green thumb', 'Five plants in one room'],
    ['books', 'Bookworm', 'Two bookshelves in one room'],
    ['gallery', 'Gallery wall', 'Four pieces of wall art'],
    ['cozy', 'All moved in', 'Twenty-five things in one room'],
    ['design', 'Redecorator', 'Changed the walls and the floor'],
    ['fire', 'Hearth', 'Lit the fireplace'],
    ['piano', 'Little tune', 'Played the piano'],
    ['sleep', 'Sweet dreams', 'Slept through the night'],
    ['gamer', 'Player one', 'Played a video game'],
    ['fish', 'Fish friends', 'Said hi to the fish'],
    ['barista', 'Barista', 'Brewed a fresh pot of coffee'],
    ['cinema', 'Movie night', 'Rolled a film after dark'],
    ['golden', 'Golden hour', 'Evening light through an open window'],
    ['hanami', 'Hanami', 'Watched the cherry blossoms fall'],
    ['lucky', 'Lucky cat', 'A maneki-neko waved hello'],
    ['tram', 'All aboard', 'Rang the tram bell'],
    ['city', 'City lights', 'An open-air scene after dark'],
    ['photo', 'Snapshot', 'Took a photo of your room'],
    ['greenhouse', 'Greenhouse', 'Ten plants in one room'],
    ['nightshift', 'Night shift', 'Working at a desk after midnight'],
    ['mixtape', 'Mixtape', 'Three jukebox tracks in one session'],
    ['stormwatch', 'Storm watcher', 'Rain outside, window open'],
    ['crates', 'Crates', 'Setup complete: a record crate, a player and speakers'],
    ['siesta', 'Siesta', 'A nap in the afternoon sunbeam'],
    ['snowedin', 'Snowed in', 'The fire lit on a rainy night'],
    ['stormy', 'Stormy night', 'Rain, a crackling fire and music all at once'],
    ['stormytea', 'Stormy tea', 'Tea while it rains'],
    ['moonlight', 'Moonlight sonata', 'Played the piano at night'],
    ['parliament', 'Cat parliament', 'All five cats in one room'],
    ['culprit', 'Whodunnit', 'A cat knocked something off a table'],
    ['visitor', 'Neighbour cat', 'A cat from next door dropped by'],
    ['catseye', 'Cat’s-eye view', 'Saw the room through a cat’s eyes'],
  ].concat(LR.MOMENTS || []);   // theme packs can add their own with LR.MOMENTS.push([key, name, description])
  const found = new Set(store.get('lr.found', []));

  // ---------------------------------------------------------------
  // Rooms: a list of saved rooms, one open at a time
  let rooms = store.get('lr.rooms', []);
  const meta = Object.assign({ current: 0, realtime: true, phase: 'day', raining: false, music: false, sound: true, painted: {} }, store.get('lr.meta', {}));
  Sound.on = meta.sound;
  Sound.crackleOn = meta.crackle !== false;
  // music mood: 'auto' follows the time of day (morning bossa, afternoon chill, evening lofi, night ambient; jazz when it rains)
  if (meta.mood == null || meta.mood === 0 && !meta.moodSet) meta.mood = 'auto';
  const MOOD_BY = { morning: 4, day: 3, evening: 0, night: 5 };
  const autoMood = () => (meta.raining ? 1 : MOOD_BY[meta.phase] != null ? MOOD_BY[meta.phase] : 0);
  function applyMood() { return Sound.setMood(meta.mood === 'auto' ? autoMood() : meta.mood); }
  applyMood();
  let moodsPlayed = new Set();
  const room = new LR.Room();
  function loadRoom(id) {
    const d = store.get('lr.room.' + id, null);
    if (d && room.load(d)) { meta.current = id; return true; }
    return false;
  }
  let fresh = false;
  if (!rooms.length || !loadRoom(meta.current)) {
    if (rooms.length && loadRoom(rooms[0].id)) { /* recovered */ }
    else {
      PRESETS.study.make(room); room.name = PRESETS.study.name;
      const id = Date.now();
      rooms = [{ id, name: room.name, n: room.items.length }];
      meta.current = id; fresh = true;
    }
  }

  // ---------------------------------------------------------------
  // Renderer
  const bg = $('#bg'), stars = $('#stars');
  let liftNow = 40;
  const view = new LRRender.Renderer($('#c'), {
    catViewEnded() { document.body.classList.remove('catcam'); },
    catLand() { Sound.thump(0.5); },
    catSigh() { Sound.sigh(); },
    thunder() { const near = Math.random() < 0.4; setTimeout(() => Sound.thunder(near), near ? 120 : 500 + Math.random() * 900); },
    sky(top, bot, night) {
      bg.style.background = `linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
      stars.style.opacity = Math.max(0, night - 0.4) * 1.6;
      document.body.classList.toggle('night', night > 0.6);
      const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = top;
    },
    lift() { return liftNow; },
  });
  const state = { mode: store.get('lr.mode', 'explore'), tool: 'add', group: 'furniture', add: 'sofa', addR: null, paintTab: 'walls', drag: null };
  const undo = [];

  (function starsBg() {
    const c = document.createElement('canvas'); c.width = 600; c.height = 900;
    const g = c.getContext('2d');
    for (let k = 0; k < 150; k++) {
      const s = Math.random() < 0.15 ? 3 : 2;
      g.fillStyle = `rgba(255,255,240,${0.35 + Math.random() * 0.6})`;
      g.fillRect((Math.random() * 600) | 0, (Math.random() * 900) | 0, s, s);
    }
    stars.style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  function realPhase() {
    const h = new Date().getHours();
    return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
  }
  if (meta.realtime) meta.phase = realPhase();
  view.env.phase = meta.phase; view.env.rain = !!meta.raining;
  view.setPhase(meta.phase, true);
  view.rainK = meta.raining ? 1 : 0; view.setRain(!!meta.raining); view.applyPhase(1);
  document.body.classList.toggle('raining', !!meta.raining);
  if (!meta.weather) meta.weather = meta.raining ? 'rain' : 'clear';
  setTimeout(() => applyWeather(meta.weather, true), 0);
  view.music = false;
  view.sync(room);

  // ---------------------------------------------------------------
  // Toasts & moments
  const toastQ = [];
  let toastBusy = 0;
  function toast(html, ms, now) {
    if (now) { toastQ.length = 0; toastBusy = 0; document.querySelectorAll('#toasts .toast').forEach(el => el.remove()); }   // drag hints jump the queue
    if (performance.now() < toastBusy) { if (toastQ.length < 4) toastQ.push([html, ms]); return; }
    toastBusy = performance.now() + Math.min(ms || 3200, 1500);
    setTimeout(() => { if (toastQ.length) toast(...toastQ.shift()); }, Math.min(ms || 3200, 1500) + 50);
    const el = document.createElement('div');
    el.className = 'toast'; el.innerHTML = html;
    $('#toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, ms || 3200);
  }
  // one special moment a day: the same task for everyone on a given date
  const DAILY = [
    ['tea', 'Make yourself a cup of tea'], ['purr', 'Pet one of the cats'], ['lofi', 'Put a record on'], ['light', 'Switch on a lamp'],
    ['fish', 'Say hi to the fish'], ['barista', 'Brew a pot of coffee'], ['feast', 'Feed a cat'], ['stargazer', 'Find a constellation'],
    ['cuckoo', 'Hear the cuckoo clock'], ['photo', 'Take a photo of your room'], ['gamer', 'Play a video game'], ['fire', 'Light the fireplace'], ['piano', 'Play the piano'],
  ];
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const dailyTask = () => { const d = new Date(); const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5) + d.getFullYear() * 7; return DAILY[n % DAILY.length]; };
  function dailyCheck(key) {
    const D = meta.daily || (meta.daily = {});
    if (D.date === today() || dailyTask()[0] !== key) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    D.streak = D.date === yKey ? (D.streak || 0) + 1 : 1; D.date = today(); saveMeta();
    setTimeout(() => { toast(`<b>☀ Today's moment</b><span>${dailyTask()[1]}. Streak: ${D.streak} day${D.streak > 1 ? 's' : ''}</span>`, 3200); Sound.arpeggio(); }, 1800);
  }
  function discover(key) {
    dailyCheck(key);
    if (key === 'tea' && meta.raining) setTimeout(() => discover('stormytea'), 2000);
    if (key === 'piano' && meta.phase === 'night') setTimeout(() => discover('moonlight'), 2000);
    if (found.has(key) || $('#intro').classList.contains('open')) return;
    const d = MOMENTS.find(x => x[0] === key);
    if (!d) return;
    found.add(key); store.set('lr.found', [...found]);
    toast(`<b>✦ ${d[1]}</b><span>${d[2]}</span>`, 3800);
    Sound.chime(); if (key === 'cozy') setTimeout(() => Sound.arpeggio(), 600);
    updateHeader();
  }
  function checkRoomMoments() {
    const n = t => room.count(i => i.t === t);
    const plants = room.count(i => CAT[i.t].group === 'plants');
    if (plants >= 5) discover('green');
    if (plants >= 10) discover('greenhouse');
    if (new Set(room.items.filter(i => i.t === 'cat' && !i.visitor && i.c < 5).map(i => i.c)).size >= 5) discover('parliament');
    if (room.items.some(i => i.t === 'vinylcrate') && room.items.some(i => CAT[i.t].anim === 'record') && room.items.some(i => CAT[i.t].anim === 'speaker')) discover('crates');
    if (meta.raining && room.items.some(i => CAT[i.t].beam && i.on)) discover('stormwatch');
    if (n('bookshelf') >= 2) discover('books');
    if (n('painting') + n('poster') + n('mirror') + n('neon') + n('clock') >= 4) discover('gallery');
    if (room.items.length >= 25) discover('cozy');
    if (meta.painted.wall && meta.painted.floor) discover('design');
    if (view.ph.night > 0.6 && room.items.some(i => CAT[i.t].light && i.on)) discover('nightowl');
    if (meta.phase === 'evening' && room.items.some(i => CAT[i.t].beam && i.on)) discover('golden');
    if (view.ph.night > 0.6 && WALLS[room.wall.style] && WALLS[room.wall.style].none && room.items.length >= 8) discover('city');
  }
  function updateHeader() {
    $('#roomName').textContent = room.name;
    $('#disc').textContent = `✦ ${found.size} of ${MOMENTS.length} cozy moments`;
    $('#bRain').classList.toggle('on', (meta.weather || 'clear') !== 'clear');
    $('#bMusic').classList.toggle('on', !!meta.music);
    $('#bTime').dataset.phase = meta.phase;
  }
  const haptic = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* unsupported */ } };

  // ---------------------------------------------------------------
  // Changing the room
  function pushUndo() {
    undo.push(room.snapshot());
    if (undo.length > 40) undo.shift();
  }
  function changed() {
    view.sync(room);
    dirty = true;
    checkRoomMoments();
  }
  function doUndo() {
    if (!undo.length) { toast('<span>Nothing to undo</span>', 1200); return; }
    room.restore(undo.pop());
    changed(); updateHeader();
    Sound.turn(); haptic(5);
  }

  // ---------------------------------------------------------------
  // Tray: catalog thumbnails and paint swatches
  const thumbs = new Map();
  const thumbOf = (t, c) => {
    const k = t + ':' + (c || 0);
    if (!thumbs.has(k)) thumbs.set(k, view.thumb({ t, c: c || 0, on: CAT[t].on !== undefined ? CAT[t].on : false, r: 0, seed: 7 }));
    return thumbs.get(k);
  };
  function swatchCanvas(draw) {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d');
    for (let x = 0; x < 24; x++) for (let y = 0; y < 24; y++) {
      g.fillStyle = LR.hex(draw(x, y)); g.fillRect(x * 2, (23 - y) * 2, 2, 2);
    }
    return c;
  }
  const tray = $('#tray'), tabs = $('#tabs'), row = $('#row');
  function renderTray() {
    const show = state.mode === 'edit' && (state.tool === 'add' || state.tool === 'paint');
    tray.classList.toggle('open', show);
    tabs.innerHTML = ''; row.innerHTML = '';
    if (!show) return;
    const tab = (label, on, fn) => {
      const b = document.createElement('button'); b.className = 'tab' + (on ? ' on' : ''); b.textContent = label;
      b.onclick = () => { fn(); renderTray(); Sound.blip(); };
      tabs.appendChild(b);
    };
    if (state.tool === 'add') {
      GROUPS.forEach(([k, label]) => tab(label, state.group === k, () => { state.group = k; }));
      Object.values(CAT).filter(C => C.group === state.group).forEach(C => {
        const b = document.createElement('button');
        b.className = 'swatch' + (state.add === C.key ? ' on' : '');
        const name = C.kind === 'pet' ? 'Cats' : C.name;
        b.innerHTML = `<img alt="" src="${thumbOf(C.key, 0)}"><span>${name}</span>`;
        b.title = name;
        b.onclick = () => pickAdd(C.key, true);
        row.appendChild(b);
      });
    } else {
      tab('Walls', state.paintTab === 'walls', () => { state.paintTab = 'walls'; });
      tab('Wall colour', state.paintTab === 'color', () => { state.paintTab = 'color'; });
      tab('Floor', state.paintTab === 'floor', () => { state.paintTab = 'floor'; });
      tab('Plot size', state.paintTab === 'size', () => { state.paintTab = 'size'; });
      const wc = (WALL_COLORS[room.wall.color] || WALL_COLORS[0])[1];
      if (state.paintTab === 'walls') {
        Object.entries(WALLS).forEach(([k, W]) => {
          const b = document.createElement('button'); b.className = 'swatch' + (room.wall.style === k ? ' on' : '');
          b.appendChild(swatchCanvas((x, y) => W.fn(wc, x + 64, y + 2)));
          b.insertAdjacentHTML('beforeend', `<span>${W.label}</span>`);
          b.onclick = () => paintRoom(() => { room.wall.style = k; meta.painted.wall = true; });
          row.appendChild(b);
        });
      } else if (state.paintTab === 'color') {
        WALL_COLORS.forEach(([name, c], i) => {
          const b = document.createElement('button'); b.className = 'dot' + (room.wall.color === i ? ' on' : '');
          b.innerHTML = `<i style="background:${LR.hex(c)}"></i><span>${name}</span>`;
          b.onclick = () => paintRoom(() => { room.wall.color = i; meta.painted.wall = true; }, 'color');
          row.appendChild(b);
        });
      } else if (state.paintTab === 'size') {
        const names = { 10: 'Cozy', 14: 'Roomy', 20: 'Block', 24: 'City' };
        LR.SIZES.forEach(n => {
          const b = document.createElement('button'); b.className = 'swatch' + (room.n === n ? ' on' : '');
          b.appendChild(swatchCanvas((x, y) => {
            const c = x, r = y, o = (24 - n) / 2;
            const inside = c >= o && c < o + n && r >= o && r < o + n;
            return inside ? ((c + r) & 1 ? 0xb89a72 : 0xa8885f) : 0x2a1c38;
          }));
          b.insertAdjacentHTML('beforeend', `<span>${n}×${n}</span>`); b.title = `${names[n] || 'Plot'} ${n}×${n}`;
          b.onclick = () => setPlot(n);
          row.appendChild(b);
        });
      } else {
        Object.entries(FLOORS).forEach(([k, Fl]) => {
          const b = document.createElement('button'); b.className = 'swatch' + (room.floor.style === k ? ' on' : '');
          b.appendChild(swatchCanvas((x, y) => Fl.fn(x + 64, y + 64)));
          b.insertAdjacentHTML('beforeend', `<span>${Fl.label}</span>`);
          b.onclick = () => paintRoom(() => { room.floor.style = k; meta.painted.floor = true; }, 'floor');
          row.appendChild(b);
        });
      }
      row.insertAdjacentHTML('beforeend', state.paintTab === 'size'
        ? '<div class="hint">Bigger plots fit whole city blocks. Your pieces stay put when it grows.</div>'
        : '<div class="hint">Tip: tap any piece in the room to try its next colour.</div>');
    }
    const on = row.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    updateTrayArrows();
  }
  function pickAdd(key, fromTray) {
    const C = CAT[key];
    state.add = key; state.addR = null;
    renderTray(); Sound.turn(); refreshGhost();
    if (fromTray || !FINE) toast(`<span>${FINE ? 'Click' : 'Tap'} the room to place ${C.kind === 'pet' ? 'a cat' : 'the ' + C.name.toLowerCase()}</span>`, 1400);
  }

  // ---------------------------------------------------------------
  // Desktop: the mouse wheel and click-drag scroll the tray, arrows step through it
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function hScroll(el) {
    el.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // trackpads already scroll sideways
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      el.scrollBy({ left: d * 1.2, behavior: Math.abs(d) >= 50 ? 'smooth' : 'auto' });
    }, { passive: false });
    let drag = null;
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, s: el.scrollLeft, moved: false }; });
    window.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; el.classList.add('dragging'); }
      if (drag.moved) el.scrollLeft = drag.s - dx;
    });
    window.addEventListener('pointerup', () => {
      if (drag && drag.moved) { el.dataset.dragged = '1'; setTimeout(() => { delete el.dataset.dragged; }, 0); }
      el.classList.remove('dragging'); drag = null;
    });
    el.addEventListener('click', e => { if (el.dataset.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    el.addEventListener('scroll', updateTrayArrows, { passive: true });
  }
  function updateTrayArrows() {
    const max = row.scrollWidth - row.clientWidth;
    $('#trayPrev').hidden = row.scrollLeft < 4;
    $('#trayNext').hidden = row.scrollLeft > max - 4;
  }
  hScroll(row); hScroll(tabs);
  $('#trayPrev').onclick = () => row.scrollBy({ left: -row.clientWidth * 0.7, behavior: 'smooth' });
  $('#trayNext').onclick = () => row.scrollBy({ left: row.clientWidth * 0.7, behavior: 'smooth' });
  window.addEventListener('resize', updateTrayArrows);

  // keyboard: step through the tray (←/→) and its tabs (↑/↓)
  function stepTray(dir) {
    if (state.tool === 'add') {
      const list = Object.values(CAT).filter(C => C.group === state.group);
      const i = list.findIndex(C => C.key === state.add);
      pickAdd(list[(i + dir + list.length) % list.length].key);
    } else {
      const items = [...row.querySelectorAll('.swatch, .dot')];
      const i = items.findIndex(b => b.classList.contains('on'));
      const next = items[(i + dir + items.length) % items.length];
      if (next) next.click();
    }
  }
  function stepTab(dir) {
    if (state.tool === 'add') {
      const i = GROUPS.findIndex(g => g[0] === state.group);
      state.group = GROUPS[(i + dir + GROUPS.length) % GROUPS.length][0];
      const first = Object.values(CAT).find(C => C.group === state.group);
      if (first) state.add = first.key;
      state.addR = null;
    } else {
      const order = ['walls', 'color', 'floor', 'size'];
      state.paintTab = order[(order.indexOf(state.paintTab) + dir + order.length) % order.length];
    }
    renderTray(); Sound.turn(); refreshGhost();
  }
  // grow or shrink the plot; growing keeps everything where it is, shrinking only if nothing would fall off
  function setPlot(n) {
    if (n === room.n) return;
    if (n < room.n) {
      const out = room.items.filter(it => {
        const C = CAT[it.t];
        if (!C || it.p) return false;
        if (C.kind === 'wall') return it.u + C.size[0] > n;
        const [w, d] = LR.fp(it);
        return it.x + w > n || it.z + d > n;
      });
      if (out.length) { toast(`<span>Move ${out.length} piece${out.length > 1 ? 's' : ''} in from the edges first</span>`, 1800); Sound.turn(); return; }
    }
    paintRoom(() => { room.n = n; }, 'size');
    toast(`<span>Plot is now ${n}×${n}</span>`, 1100);
  }
  function paintRoom(fn, kind) {
    pushUndo(); fn(); saveMeta(); changed(); renderTray();
    (kind === 'floor' ? Sound.brush() : kind === 'color' ? Sound.tick2() : kind === 'size' ? Sound.place(0.9) : Sound.roller()); haptic(6);
  }

  document.querySelectorAll('.tools button').forEach(b => {
    b.onclick = () => {
      if (b.dataset.mode === 'explore') { setMode('explore'); return; }
      state.tool = b.dataset.tool;
      document.querySelectorAll('.tools button').forEach(x => x.classList.toggle('on', x.dataset.tool === state.tool));
      renderTray(); view.setGhost(null);
      const tips = { move: 'Drag a piece to move it', turn: 'Tap a piece to turn it', paint: 'Pick a wall or floor style, or tap a piece to recolour it', remove: 'Tap a piece to put it away' };
      if (tips[state.tool]) toast(`<span>${tips[state.tool]}</span>`, 1500);
      Sound.init(); Sound.turn();
    };
  });

  // ---------------------------------------------------------------
  // Explore / Decorate
  function setMode(mode, quiet) {
    if (mode !== 'explore') exitCat(true);
    state.mode = mode;
    store.set('lr.mode', mode);
    document.body.classList.toggle('exploring', mode === 'explore');
    state.drag = null; view.setGhost(null); setHidden(0);
    view.petsPaused = mode === 'edit';
    renderTray();
    if (quiet) return;
    haptic(6);
    if (mode === 'edit' && !store.get('lr.tipEdit', false)) {
      store.set('lr.tipEdit', true);
      toast('<b>Decorating</b><span>Pick something from the tray, then tap or drag in the room to place it.</span>', 4200);
    }
    if (mode === 'edit' && FINE && !store.get('lr.tipKeys', false)) {
      store.set('lr.tipKeys', true);
      toast('<b>Mouse & keys</b><span>Scroll the tray with the wheel · <kbd>←</kbd><kbd>→</kbd> pick · <kbd>↑</kbd><kbd>↓</kbd> tabs · <kbd>R</kbd> turn · <kbd>Del</kbd> remove</span>', 5200);
    }
    view.setHover(0);
  }
  $('#bEdit').onclick = () => { setMode('edit'); Sound.init(); };
  if (FINE) {
    const hints = { add: 'Add (1)', move: 'Move (2)', turn: 'Turn (3, or R over a piece)', paint: 'Paint (4)', remove: 'Remove (5, or Delete over a piece)' };
    document.querySelectorAll('.tools [data-tool]').forEach(b => { b.title = hints[b.dataset.tool]; });
    document.querySelector('.tools [data-mode]').title = 'Done (Esc)';
    const chip = { bTime: 'Time of day', bRain: 'Weather: clear, rain, storm, snow, sakura', bMusic: 'Lofi radio (M)', bUndo: 'Undo (Ctrl+Z)', bPhoto: 'Photo', bMenu: 'Menu (H)', bCat: 'Cat view (C)', rotL: 'Turn the room (Q)', rotR: 'Turn the room (E)', bEdit: 'Decorate (X)', bSurprise: 'Surprise room (G)' };
    for (const id in chip) { const el = document.getElementById(id); if (el) el.title = chip[id]; }
  }

  function surprise() {
    pushUndo();
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const th = room.generate(seed);
    view.panGoal.set(0, 0, 0); view.zoomGoal = 1;
    changed(); updateHeader(); saveIndex();
    toast(`<b>${room.name}</b><span>${th.name} · Undo brings your old room back</span>`, 2600);
    const d = $('#bSurprise svg'); if (d) { d.classList.remove('spin'); requestAnimationFrame(() => d.classList.add('spin')); }
    Sound.arpeggio(); haptic(10);
  }
  $('#bSurprise').onclick = () => { Sound.init(); surprise(); };

  // ---------------------------------------------------------------
  // Placement: where would this piece go under the finger?
  function setHidden(id) {
    view.hiddenId = id || 0;
    view.applyVisibility(); view.assignLights();
  }
  const clampI = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // base: the piece's type/colour/rotation; grab: offset between finger and anchor when moving
  function candidate(cx, cy, base, grab) {
    const C = CAT[base.t];
    const it = Object.assign({ t: base.t, c: base.c, r: base.r || 0, on: base.on, seed: base.seed, name: base.name }, {});
    if (C.kind === 'wall') {
      const w = view.pickWall(cx, cy, true);
      if (!w) return null;
      const [ww, wh] = C.size;
      it.k = w.k;
      it.u = clampI(Math.round(w.u - (grab ? grab.u : ww / 2)), 0, room.n - ww);
      it.e = clampI(Math.round(w.e - (grab ? grab.e : wh / 2)), 0, HC - wh);
      return it;
    }
    if (C.kind === 'small') {
      const ex = base.id ? [base.id, ...room.descendants(base.id).map(i => i.id)] : [];
      const hit = view.pickItem(cx, cy, ex);
      if (hit && !hit.behindWall) {
        let owner = room.get(hit.id);
        if (owner && !CAT[owner.t].top && owner.p) owner = room.get(owner.p);
        if (owner && CAT[owner.t].top) {
          const OC = CAT[owner.t], [w, d] = OC.size;
          const obj = view.objs.get(owner.id);
          const lp = obj.userData.inner.worldToLocal(hit.point.clone().add(view.root.position));
          const [cw, cd] = fp(it);
          it.p = owner.id; it.lx = clampI(Math.floor(lp.x - (cw - 1) / 2), 0, w - cw); it.lz = OC.kind === 'wall' ? 0 : clampI(Math.floor(lp.z - (cd - 1) / 2), 0, d - cd);
          return it;
        }
      }
    }
    const p = view.pickFloor(cx, cy);
    if (!p || p.x < -2 || p.z < -2 || p.x > room.n + 2 || p.z > room.n + 2) return null;
    const place = r => {
      const o = Object.assign({}, it, { r });
      const [fw, fd] = fp(o);
      o.x = clampI(Math.round(p.x - (grab ? grab.x : fw / 2)), 0, room.n - fw);
      o.z = clampI(Math.round(p.z - (grab ? grab.z : fd / 2)), 0, room.n - fd);
      return o;
    };
    if (!grab && C.wallish && state.addR == null) {
      // back it against the nearest wall, like you would in real life
      for (const r of [0, 1, 2, 3]) {
        const o = place(r), [fw, fd] = fp(o);
        const touches = (r === 0 && o.z === 0) || (r === 1 && o.x === 0) || (r === 2 && o.z + fd === room.n) || (r === 3 && o.x + fw === room.n);
        if (touches && room.canPlace(o)) return o;
      }
    }
    return place(it.r);
  }
  function applyPlacement(it, cand) {
    ['x', 'z', 'k', 'u', 'e', 'p', 'lx', 'lz', 'tipped'].forEach(k => delete it[k]);
    ['x', 'z', 'k', 'u', 'e', 'p', 'lx', 'lz', 'r'].forEach(k => { if (cand[k] !== undefined) it[k] = cand[k]; });
  }

  // ---------------------------------------------------------------
  // Tapping things in the room
  function interact(id) {
    const it = room.get(id);
    if (!it) return;
    const C = CAT[it.t];
    view.boing(id); haptic(5);
    if (it.tipped) { pushUndo(); it.tipped = false; changed(); Sound.place(weightOf(it)); toast(`<span>Picked the ${C.name.toLowerCase()} back up</span>`, 1200); return; }
    const tap = C.tap;
    if (tap === 'toggle') {
      pushUndo(); it.on = !it.on; changed();
      toggleSound(it, C);
      if (it.on && C.light) discover('light');
      if (it.on && it.t === 'fireplace') discover('fire');
      return;
    }
    // a declarative tap any piece can describe with fx: { toggle, say, sayOn, sayOff, burst, secs, sfx, sparkle, excite, spin, door, moment }
    if (tap === 'fx') {
      const F = C.fx || {};
      if (F.toggle) { pushUndo(); it.on = !it.on; changed(); if (it.on && C.light) discover('light'); }
      if (F.burst && (!F.toggle || it.on)) view.burst(id, F.burst, F.secs || 3);
      if (F.sparkle) view.sparkle(view.itemPoint(id, C.burstAt || [4, 8, 4]), F.sparkle, 12);
      if (F.excite) view.excite(id);
      if (F.spin) view.spin(id);
      if (F.door) view.openDoor(id);
      [].concat(F.sfx || (F.toggle ? 'click' : [])).forEach((s, k) => setTimeout(() => Sound[s] && Sound[s](it.on), k * 160));
      const lines = F.toggle ? (it.on ? F.sayOn : F.sayOff) || F.say : F.say;
      if (lines && lines.length) toast(`<span>${pickOne([].concat(lines))}</span>`, 1400);
      if (F.moment) discover(F.moment);
      return;
    }
    if (tap === 'portal') {
      const target = it.link && rooms.find(r => r.id === it.link);
      if (view.fp) {   // as a cat: trot over to the doorway, the walk-through check does the rest
        const [fx, fz] = doorFront(it);
        if (!view.walkCatTo(view.fp.id, fx, fz)) { const me = room.get(view.fp.id); if (target) walkThrough(it, target.id, me && { c: me.c, name: me.name }); else doorPicker(it); }
        else toast(`<span>${target ? `To ${target.name}` : 'A door to somewhere new'}</span>`, 1000, true);
        return;
      }
      if (target) walkThrough(it, target.id); else doorPicker(it);
      return;
    }
    if (tap === 'cuckoo') { cuckoo(id); return; }
    if (tap === 'read') { Sound.flip(); toast(`<span>${pickOne(C.lines)}</span>`, 2200); return; }
    if (tap === 'calendar') {
      const o = view.objs.get(id); if (o) o.userData.playUntil = view.t + 0.7;
      Sound.flip();
      toast(`<span>${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>`, 1600);
      return;
    }
    if (tap === 'feeder') {
      view.feedBirds(id); Sound.crunch(); setTimeout(() => Sound.tweet(), 500); setTimeout(() => Sound.tweet(), 1300);
      view.sparkle(view.itemPoint(id, [4, 4, 5]), 0xc8a060, 10);
      toast(`<span>${pickOne(['A robin and a blue tit swoop in', 'Seed scattered, here they come', 'Tweet tweet!'])}</span>`, 1500);
      return;
    }
    if (tap === 'mood') {
      // cycle: auto → each mood in turn → back to auto
      const n = Sound.moods.length;
      meta.mood = meta.mood === 'auto' ? 0 : meta.mood + 1 >= n ? 'auto' : meta.mood + 1;
      meta.moodSet = true;
      const name = (meta.mood === 'auto' ? 'Follow the day · ' : '') + applyMood();
      moodsPlayed.add(Sound.mood); if (moodsPlayed.size >= 3) discover('mixtape');
      if (!meta.music) setMusic(true); else saveMeta();
      view.excite(id); view.sparkle(view.itemPoint(id, [4, 14, 4]), 0xffd27a, 10);
      toast(`<span>Now playing: ${name}</span>`, 1600); discover('lofi');
      return;
    }
    if (tap === 'stars') {
      if (meta.phase === 'night' || meta.phase === 'evening' && Math.random() < 0.5) {
        const sky = ['Orion, the hunter', 'The Big Dipper', 'Cassiopeia’s W', 'Lyra and bright Vega', 'The Pleiades, seven sisters', 'Cygnus, the swan', 'A shooting star! Make a wish', 'Saturn, rings and all'];
        Sound.chime(); view.sparkle(view.itemPoint(id, [4, 16, 9]), 0xd8e0ff, 14);
        toast(`<span>✦ ${pickOne(sky)}</span>`, 1800); discover('stargazer');
      } else { Sound.click(false); toast(`<span>${meta.phase === 'evening' ? 'Not dark enough yet' : 'Too bright out there'}</span>`, 1300); }
      return;
    }
    if (tap === 'bowl') {
      Sound.crunch();
      const cat = view.callCat(id);
      if (cat) { const ci = room.get(cat); setTimeout(() => Sound.meow(), 300); toast(`<span>${ci ? (ci.name || (CATS[ci.c] || CATS[0]).name) : 'A cat'} comes running!</span>`, 1500); discover('feast'); }
      else toast(`<span>${room.items.some(i => i.t === 'cat') ? 'Nobody can reach the bowl' : 'Food’s out, but no cats yet'}</span>`, 1400);
      return;
    }
    if (tap === 'treats') { Sound.crunch(); toast('<span>Shake shake! Drop the jar on a cat with Move</span>', 1600); return; }
    if (tap === 'curtain') { pushUndo(); it.on = !it.on; changed(); Sound.swish(); toast(`<span>${it.on ? 'Curtains open' : 'Curtains drawn'}</span>`, 1100); return; }
    if (tap === 'music') { setMusic(!meta.music); return; }
    if (tap === 'pet') {
      const P = CATS[it.c] || CATS[0];
      view.petCat(id); Sound.purr(true); setTimeout(() => Sound.purr(false), 2600);
      follow = { id, until: performance.now() + 9000 };   // for a little while it follows your taps
      if (Math.random() < 0.1) setTimeout(() => Sound.meow(0.8), 500);   // rare, so it stays special
      toast(`<span>${it.name || P.name} purrs ♥</span>`, 1600);
      discover('purr');
      return;
    }
    if (tap === 'sip') {
      Sound.sip(); discover('tea');
      const p = view.itemPoint(id, [4.5, 5, 4.5]);
      for (let k = 0; k < 10; k++) view.fx.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 0xffffff, 0.08, 1.4, -0.05, 0.4, 0.6);
      toast('<span>Mmm, still warm</span>', 1200);
      return;
    }
    if (tap === 'water') {
      Sound.water();
      const p = view.itemPoint(id, [4, 14, 4]);
      for (let k = 0; k < 3; k++) setTimeout(() => view.icon('drop', p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)), { size: 0.22, vy: -0.4, life: 1 }), k * 150);
      view.sparkle(p, 0xa8f0a0, 10);
      return;
    }
    if (tap === 'time') {
      const d = new Date();
      toast(`<span>It's ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>`, 1600);
      Sound.click(true);
      return;
    }
    if (tap === 'piano') {
      Sound.piano(); discover('piano');
      for (let k = 0; k < 4; k++) setTimeout(() => { const p = view.itemPoint(id, [3 + k * 3, 18, 6]); if (p) view.icon('note', p, { size: 0.3 }); }, k * 200);
      return;
    }
    if (tap === 'sleep') { Sound.blanket(); sleep(); return; }
    if ((tap === 'screen' || tap === 'type') && new Date().getHours() < 5) setTimeout(() => discover('nightshift'), 1200);
    if (tap === 'screen') {
      // off → each channel in turn → off
      const chans = C.channels || [];
      if (!it.on) { it.on = true; it.ch = 0; Sound.click(true); if (C.boot) Sound.boot(); }
      else if ((it.ch | 0) + 1 >= chans.length) { it.on = false; it.ch = 0; Sound.click(false); }
      else { it.ch = (it.ch | 0) + 1; Sound.static(); }
      changed();
      if (it.on) toast(`<span>${CH_NAMES[chans[it.ch | 0]] || 'On'}</span>`, 1100);
      if (it.on && /game|arcade|retro/.test(chans[it.ch | 0])) discover('gamer');
      if (it.on && it.t === 'projector' && view.ph.night > 0.3) discover('cinema');
      return;
    }
    if (tap === 'console') {
      // wake up the TVs and put the game on
      Sound.boot(); setTimeout(() => Sound.chiptune(), 200);
      let any = false;
      room.items.forEach(o => { const OC = CAT[o.t]; const g = OC.channels ? OC.channels.findIndex(c => c === 'game' || c === 'retro') : -1; if (g >= 0 && o.t !== 'handheld' && o.t !== 'computer') { o.on = true; o.ch = g; any = true; view.boing(o.id); } });
      changed(); discover('gamer');
      toast(`<span>${any ? 'Player 1 ready!' : 'Player 1 ready! (Add a TV to play on)'}</span>`, 1500);
      return;
    }
    if (tap === 'arcade') {
      if (!it.on) { it.on = true; changed(); }
      Sound.coin(); setTimeout(() => Sound.chiptune(), 300);
      view.play(id, 9); discover('gamer');
      toast('<span>Insert coin… GO!</span>', 1300);
      return;
    }
    if (tap === 'tank') {
      view.excite(id);
      // switching the light on is breakfast time: food drifts down and the fish swarm it
      if (!C.tank.bowl && !C.tank.pond) { it.on = !it.on; changed(); Sound.click(it.on); if (it.on) { setTimeout(() => { view.feedFish(id); Sound.plop(); }, 120); discover('fish'); } toast(`<span>${it.on ? 'Light on, breakfast time!' : 'Tank light off'}</span>`, 1100); }
      else { Sound.gurgle(3); toast('<span>Blub!</span>', 900); discover('fish'); }
      return;
    }
    if (tap === 'door') {
      view.openDoor(id);
      if (it.t === 'minifridge') { Sound.fridge(true); setTimeout(() => Sound.fridge(false), 2700); toast(`<span>${pickOne(['Grabbed a cold soda', 'Just looking…', 'Midnight snack time', 'Oat milk, nice'])}</span>`, 1500); }
      else { Sound.creak(); setTimeout(() => Sound.creak(), 2600); toast(`<span>${pickOne(['What to wear…', 'So many sweaters', 'Found a lost sock'])}</span>`, 1500); }
      return;
    }
    if (tap === 'raise') { it.on = !it.on; changed(); Sound.hum(it.on); toast(`<span>${it.on ? 'Standing mode' : 'Sitting mode'}</span>`, 1100); return; }
    if (tap === 'blinds') { it.on = !it.on; changed(); Sound.rustle(); toast(`<span>${it.on ? 'Blinds up' : 'Blinds down'}</span>`, 1000); return; }
    if (tap === 'spin') { view.spin(id); Sound.whoosh(); return; }
    if (tap === 'puff') { view.burst(id, 'smoke', 3.5); Sound.puff(); toast('<span>Bubble bubble…</span>', 1100); return; }
    if (tap === 'boil') { view.burst(id, 'steam', 3.5); Sound.whistle(); toast('<span>The kettle’s singing</span>', 1400); discover('tea'); return; }
    if (tap === 'brew') { view.burst(id, 'steam', 4); Sound.gurgle(10); toast('<span>Fresh coffee ☕</span>', 1400); discover('barista'); return; }
    if (tap === 'pour') { view.burst(id, 'steam', 2.5); Sound.pour(); toast('<span>Tea’s ready</span>', 1200); discover('tea'); return; }
    if (tap === 'sink') { view.burst(id, 'drip', 1.5); Sound.drip(); return; }
    if (tap === 'strum') {
      Sound.strum();
      for (let k = 0; k < 3; k++) setTimeout(() => { const p = view.itemPoint(id, [4, 14 + k * 3, 6]); if (p) view.icon('note', p, { size: 0.28 }); }, k * 180);
      return;
    }
    if (tap === 'type') { Sound.clack(9); toast(`<span>${pickOne(['Dear diary…', 'Chapter one.', 'It was a rainy night…', 'Note to self: water plants'])}</span>`, 1500); return; }
    if (tap === 'snow') { view.burst(id, 'snow', 3); Sound.chime(); return; }
    if (tap === 'mist') { it.on = !it.on; changed(); Sound.whoosh(); toast(`<span>${it.on ? 'Lavender mist on' : 'Diffuser off'}</span>`, 1100); return; }
    if (tap === 'squeak') { Sound.squeak(); const p = view.itemPoint(id, [4, 8, 4]); if (p) view.icon('heart', p, { size: 0.3 }); return; }
    if (tap === 'robot') { view.petCat(id); Sound.beep(); toast('<span>Beep boop, cleaning!</span>', 1200); return; }
    if (tap === 'flip') { Sound.flip(); toast(`<span>${pickOne(['Rainy Day Beats', 'Midnight Tapes', 'Sunday Jazz', 'Cat Naps Vol. 2'])}</span>`, 1300); return; }
    if (tap === 'rustle') { Sound.rustle(); return; }
    if (tap === 'building') { it.on = !it.on; changed(); Sound.click(it.on); toast(`<span>${it.on ? 'Lights on upstairs' : 'Everyone’s asleep'}</span>`, 1100); return; }
    if (tap === 'traffic') { const o = view.objs.get(id); if (o) o.userData.allRed = view.t + 3; Sound.beep(); toast('<span>Walk signal!</span>', 900); return; }
    if (tap === 'tram') { Sound.bell(); toast('<span>Ding ding! All aboard</span>', 1200); discover('tram'); return; }
    if (tap === 'lucky') { view.excite(id); Sound.coin(); setTimeout(() => Sound.chime(), 200); toast(`<span>${pickOne(['Good luck is on its way!', 'Fortune smiles on you', 'Lucky day!'])}</span>`, 1400); discover('lucky'); return; }
    if (tap === 'wish') { Sound.place(); toast(`<span>${pickOne(['Make a wish…', 'Wishing you a cozy day', 'Fall down seven times, stand up eight'])}</span>`, 1500); return; }
    if (tap === 'slurp') { view.burst(id, 'steam', 2); Sound.sip(); toast('<span>Itadakimasu! 🍜</span>', 1300); discover('tea'); return; }
    if (tap === 'petals') { view.burst(id, 'petals', 3); Sound.rustle(); setTimeout(() => Sound.chime(), 150); discover('hanami'); return; }
    if (tap === 'vend') { Sound.coin(); setTimeout(() => Sound.fridge(false), 500); toast(`<span>${pickOne(['Hot canned coffee', 'Melon soda', 'Cold green tea', 'Calpis, nice', 'Royal milk tea'])}</span>`, 1500); return; }
    if (tap === 'shoji') { it.on = !it.on; changed(); Sound.rustle(); toast(`<span>${it.on ? 'Shoji slid open' : 'Shoji closed'}</span>`, 1000); return; }
    Sound.click(true);
    // nothing special to do: still give it a sound that fits
    if (!tap) {
      if (C.seat && /chair|stool/.test(it.t)) Sound.chairRoll();
      else if (C.seat || /sofa|beanbag|pouf|bed|futon|cushion|zabuton/.test(it.t)) Sound.cushion();
      else if (/book|libcase|libstack|shelf/.test(it.t)) Sound.flip();
      else Sound.place(weightOf(it) * 0.6);
    }
  }
  const pickOne = a => a[(Math.random() * a.length) | 0];
  // how heavy a piece sounds when it lands: a mug clinks, a wardrobe thuds
  function weightOf(it) {
    const C = CAT[it.t]; if (!C) return 0.4;
    if (C.kind === 'small') return 0.12;
    if (C.kind === 'rug') return 0.2;
    if (C.kind === 'pet') return 0.18;
    if (C.kind === 'wall') return 0.32;
    const [w, d] = C.size, top = typeof C.top === 'number' ? C.top : 10;
    return Math.min(1, 0.3 + w * d * 0.1 + top / 60);
  }
  const typeHash = t => { let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) | 0; return (Math.abs(h) % 100) / 100; };
  // switching things on and off sounds like the thing: lamps click (each a little different), neon crackles, fires whoosh, candles strike a match
  function toggleSound(it, C) {
    if (it.t === 'fireplace' || it.t === 'eukachel' || C.anim === 'fire') {
      if (!it.on) { Sound.lampClick(false, 0.6); return; }
      const lit = meta.litRooms || (meta.litRooms = []), first = !lit.includes(meta.current);
      Sound.ignite(first); if (first) { lit.push(meta.current); saveMeta(); }
    } else if (C.anim === 'buzz' || /neon/.test(it.t)) { if (it.on) Sound.neonOn(); else Sound.lampClick(false, 1.3); }
    else if (C.anim === 'flame' || /candle|candel/.test(it.t)) { if (it.on) Sound.matchStrike(); else Sound.soft(0.2, 0.04, 'lowpass', 900); }
    else Sound.lampClick(it.on, 0.75 + typeHash(it.t) * 0.6);
  }
  // the live soundscape, read from the room: what's here, what's on, the weather and the hour
  function itemSpot(it) {
    let i = it; for (let k = 0; i && i.p && k < 3; k++) i = room.get(i.p);
    if (!i) return null;
    if (CAT[i.t].kind === 'wall') { const n = room.n, u = i.u + 0.5, c = [[u, 0.5], [0.5, n - u], [n - u, n - 0.5], [n - 0.5, u]][i.k]; return { x: c[0], z: c[1] }; }
    const [w, d] = fp(i); return { x: i.x + w / 2, z: i.z + d / 2 };
  }
  function soundState(dt) {
    const P = view.fp && view.pets.get(view.fp.id), month = new Date().getMonth(), w = meta.weather || 'clear';
    // in cat view, closer things are louder; from above, everything sits at a gentle level
    const level = (list, base) => {
      if (!list.length) return 0;
      if (!P) return base;
      let d = Infinity; list.forEach(i => { const p = itemSpot(i); if (p) d = Math.min(d, Math.hypot(p.x - P.x, p.z - P.z)); });
      return Math.max(0.1, Math.min(1.5, 1.7 - d / 4));
    };
    const its = room.items, has = f => its.filter(f);
    return {
      dt, night: view.ph.night, indoors: !view.noWalls,
      fire: level(has(i => (i.t === 'fireplace' || i.t === 'eukachel' || CAT[i.t].anim === 'fire') && i.on), 0.8),
      clock: level(has(i => CAT[i.t].anim === 'clock' || CAT[i.t].tap === 'time' || i.t === 'cuckoo'), 0.45),
      neon: level(has(i => (CAT[i.t].anim === 'buzz' || /neon/.test(i.t)) && i.on), 0.6),
      typing: level(has(i => /laptop|computer|typewriter|cyrig|cydeck/.test(i.t) && i.on), 0.55),
      bubbler: level(has(i => CAT[i.t].tank && !CAT[i.t].tank.pond && (i.on || CAT[i.t].tank.bowl)), 0.5),
      steam: its.some(i => CAT[i.t].steam) ? 1 : 0,
      rain: w === 'storm' ? 2 : w === 'rain' ? 1 : 0,
      wind: w === 'snow' ? 1 : w === 'storm' ? 0.6 : (w === 'clear' && view.ph.night > 0.6 ? 0.4 : 0),
      crickets: month >= 5 && month <= 7 && view.ph.night > 0.6 && (w === 'clear' || w === 'sakura') ? (view.noWalls ? 1 : 0.6) : 0,
      birds: meta.phase === 'morning' && (w === 'clear' || w === 'sakura') ? 1 : 0,
      city: view.noWalls ? 0.8 : its.some(i => CAT[i.t].anim === 'rgb' || /arcade|console|gaming/.test(i.t)) ? 0.55 : 0,
      cats: its.some(i => i.t === 'cat') ? 1 : 0,
    };
  }
  function cuckoo(id) {
    view.pop(id, 2.6); Sound.cuckoo(); setTimeout(() => Sound.cuckoo(), 900);
    const d = new Date();
    toast(`<span>Cuckoo! It's ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>`, 1500);
    discover('cuckoo');
  }
  // seasonal decor: the set that matches today's date goes to the front of the tray, mentioned once a season
  (function suggestSeason() {
    const d = new Date(), m = d.getMonth(), day = d.getDate();
    const inRange = S => { const a = S.from[0] * 40 + S.from[1], b = S.to[0] * 40 + S.to[1], x = m * 40 + day; return a <= b ? x >= a && x <= b : x >= a || x <= b; };
    const S = (LR.SEASONS || []).find(inRange);
    if (!S) return;
    const i = GROUPS.findIndex(g => g[0] === S.group);
    if (i > 0) GROUPS.unshift(GROUPS.splice(i, 1)[0]);
    const key = S.group + '-' + (m === 0 ? d.getFullYear() - 1 : d.getFullYear());
    if (meta.season !== key) { meta.season = key; saveMeta(); setTimeout(() => toast(`<span>${S.label}</span>`, 3200), 4000); }
  })();
  let follow = null;
  // cat view: the room in first person, from one of the cats
  const held = new Set();
  window.addEventListener('keyup', e => { held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  window.addEventListener('blur', () => held.clear());
  const residentCats = () => room.items.filter(i => i.t === 'cat');
  function enterCat(id) {
    const cats = residentCats();
    if (!cats.length) { Sound.nope(); toast('<span>Add a cat first (Decorate, Add, Pets)</span>', 1800); return; }
    const pick = id ? room.get(id) : (follow && room.get(follow.id)) || cats.find(c => !c.visitor) || cats[0];
    if (!pick || !view.enterCatView(pick.id)) return;
    document.body.classList.add('catcam');
    $('#catName').textContent = catName(pick);
    Sound.meow(); haptic(8);
    if (!store.get('lr.tipCat', false)) { store.set('lr.tipCat', true); toast(`<span>${FINE ? 'Drag to look around, click the floor to walk, click things to use them. WASD walks too.' : 'Drag to look around, tap the floor to walk, tap things to use them'}</span>`, 3600); }
    else toast(`<span>You're ${catName(pick)} now</span>`, 1200);
    discover('catseye');
  }
  function nextCat() {
    const cats = residentCats(); if (!view.fp || cats.length < 2) return;
    const i = cats.findIndex(c => c.id === view.fp.id);
    enterCat(cats[(i + 1) % cats.length].id);
  }
  function exitCat(quiet) {
    if (!view.fp) return;
    view.exitCatView(); held.clear();
    const gone = room.items.filter(i => i.explorer);   // a cat that walked in with you heads back home
    if (gone.length) { gone.forEach(i => { view.poof(i.id, [0xffffff, 0xffd0e0]); room.remove(i.id); }); changed(); }
    document.body.classList.remove('catcam');
    if (!quiet) Sound.turn();
  }
  $('#bCat').onclick = () => { if (view.fp) exitCat(); else enterCat(); };
  $('#catNext').onclick = () => nextCat();
  $('#catExit').onclick = () => exitCat();
  const catName = it => it.name || (CATS[it.c] || CATS[0]).name;
  // mischief: now and then a cat wanders over and knocks something off a table
  function mischief() {
    if (meta.mischief === false || state.mode !== 'explore' || state.drag || !room.items.some(i => i.t === 'cat' && !i.visitor)) return;
    const pick = room.items.filter(i => {
      const C = CAT[i.t], o = i.p && room.get(i.p);
      return o && !i.tipped && CAT[o.t].kind !== 'wall' && CAT[o.t].kind !== 'small' && (typeof CAT[o.t].top !== 'function' ? CAT[o.t].top : 12) <= 22 && C.size[0] === 1 && !C.light && !C.tank && !C.screen && !room.descendants(i.id).length;
    });
    if (!pick.length) return;
    const it = pick[(Math.random() * pick.length) | 0], owner = room.get(it.p);
    const sent = view.sendCat(view.spotsAround(owner));
    if (!sent) return;
    const knock = P => {
      if (!room.get(it.id) || it.p !== owner.id) return;
      const spots = view.spotsAround(owner).filter(([x, z]) => !(Math.floor(P.x) === x && Math.floor(P.z) === z) && room.canPlace({ t: it.t, x, z, r: 0, id: -1 }));
      if (!spots.length) return;
      const [x, z] = spots[(Math.random() * spots.length) | 0];
      ['p', 'lx', 'lz'].forEach(k => delete it[k]);
      Object.assign(it, { x, z, r: (Math.random() * 4) | 0, tipped: true });
      changed(); view.poof(it.id, [0xffffff, 0xd8d0c4]); Sound.clatter(); Sound.scurry(); haptic(12);
      const cat = room.get(sent.id), who = cat ? catName(cat) : 'Someone';
      toast(`<span>${pickOne([`${who} did it`, `${who} knocked the ${CAT[it.t].name.toLowerCase()} over`, `Crash! ${who} looks innocent`, `${who} is pretending nothing happened`])}</span>`, 2000, true);
      discover('culprit');
    };
    if (sent.path.length) sent.P.onArrive = knock; else knock(sent.P);
  }
  setInterval(() => { if (Math.random() < 0.35) mischief(); }, 40000);
  // a neighbour's cat wanders in now and then, hangs out and goes home
  let visitor = null;
  function visit() {
    if (visitor || state.mode !== 'explore' || meta.visitors === false) return;
    const n = room.n, edge = [];
    for (let k = 0; k < n; k++) edge.push([k, 0], [0, k], [k, n - 1], [n - 1, k]);
    const free = edge.filter(([x, z]) => view.cellFree(x, z) && room.canPlace({ t: 'cat', x, z, r: 0, id: -1 }));
    if (!free.length) return;
    const [x, z] = free[(Math.random() * free.length) | 0];
    const it = room.add(room.make('cat', { x, z, c: 5, visitor: true }));
    visitor = it.id; changed();
    toast(`<span>Biscuit from next door wandered in 🐾</span>`, 2200, true); Sound.meow(); discover('visitor');
    setTimeout(() => {
      const v = room.get(visitor);
      visitor = null;
      if (!v) return;
      view.poof(v.id, [0xe8a050, 0xffffff]);
      room.remove(v.id); changed();
      toast('<span>Biscuit heads home</span>', 1500);
    }, 45000 + Math.random() * 30000);
  }
  setInterval(() => { if (Math.random() < 0.15) visit(); }, 60000);
  // cuckoo clocks call the hour on their own, like the wall clock tells real time
  let lastHour = new Date().getHours();
  setInterval(() => {
    const h = new Date().getHours();
    if (h === lastHour) return;
    lastHour = h;
    room.items.filter(i => i.t === 'cuckoo').forEach((i, k) => setTimeout(() => cuckoo(i.id), k * 400));
    if (room.items.some(i => CAT[i.t].anim === 'clock' || CAT[i.t].tap === 'time')) Sound.hourChime();
  }, 15000);
  const CH_NAMES = {
    code: 'Coding…', game: 'Pixel Run', viz: 'Music visualizer', fish: 'Fish screensaver', cartoon: 'Cartoons', nature: 'Nature channel',
    news: 'Evening news', retro: 'Retro pong', static: 'Static…', arcade: 'Star Raiders', movie: 'Movie night',
  };
  function sleep() {
    const dream = $('#dream');
    const wasLate = meta.phase === 'night' || meta.phase === 'evening';
    dream.classList.add('on'); Sound.purr(false);
    setTimeout(() => {
      meta.realtime = false; setPhase('morning', true);
      setTimeout(() => {
        dream.classList.remove('on');
        toast('<b>Good morning ☀</b><span>Time follows the clock again in Settings</span>', 2600);
        if (wasLate) discover('sleep');
      }, 900);
    }, 1400);
  }
  function setMusic(on) {
    meta.music = on; saveMeta();
    Sound.init(); Sound.setMusic(on);
    view.music = on;
    updateHeader();
    room.items.forEach(i => { if (i.t === 'record') view.boing(i.id); });
    if (on) { discover('lofi'); toast('<span>♪ Lofi radio on</span>', 1300); }
  }

  // ---------------------------------------------------------------
  // Input
  const canvas = $('#c');
  const pointers = new Map();
  let gesture = null, orbit = null, lastTap = null;

  function beginEdit(e) {
    const tool = state.tool;
    if (tool === 'add') {
      const C = CAT[state.add];
      const base = { t: state.add, c: 0, r: state.addR || 0, on: C.on !== undefined ? C.on : false };
      if (state.add === 'cat') base.c = (room.count(i => i.t === 'cat' && !i.visitor)) % 5;
      const cand = candidate(e.clientX, e.clientY, base);
      if (!cand) { startOrbit(e); return; }
      state.drag = { kind: 'add', base, cand, sx: e.clientX, sy: e.clientY };
      view.setGhost(cand, room.canPlace(cand), room);
      return;
    }
    const hit = view.pickItem(e.clientX, e.clientY);
    if (tool === 'move' && hit && !hit.behindWall) {
      const it = room.get(hit.id), C = CAT[it.t];
      let grab;
      if (C.kind === 'wall') { const w = view.pickWall(e.clientX, e.clientY, true); grab = w ? { u: w.u - it.u, e: w.e - it.e } : { u: CAT[it.t].size[0] / 2, e: CAT[it.t].size[1] / 2 }; }
      else if (C.kind !== 'small' || !it.p) { const p = view.pickFloor(e.clientX, e.clientY); const ix = C.kind === 'pet' ? Math.floor(view.pets.get(it.id).x) : it.x, iz = C.kind === 'pet' ? Math.floor(view.pets.get(it.id).z) : it.z; grab = C.kind === 'small' ? null : { x: p.x - ix, z: p.z - iz }; }
      state.drag = { kind: 'move', id: it.id, base: Object.assign({}, it), grab, cand: null, sx: e.clientX, sy: e.clientY };
      setHidden(it.id);
      const cand = candidate(e.clientX, e.clientY, it, grab);
      state.drag.cand = cand;
      if (cand) view.setGhost(cand, room.canPlace(cand, it.id), room);
      Sound.lift(); haptic(6);
      return;
    }
    // turn / paint / remove act on a tap; a drag spins the view instead
    startOrbit(e, hit && !hit.behindWall ? hit.id : 0);
  }
  // ---------------------------------------------------------------
  // Item-to-item: drop one thing onto another with Move and they do something together
  const nameOf = it => it.t === 'cat' ? (it.name || (CATS[it.c] || CATS[0]).name) : CAT[it.t].name.toLowerCase();
  const COMBOS = [
    { from: a => ['mug', 'teacup', 'barlatte'].includes(a.t), to: b => CAT[b.t].tap === 'brew', hint: 'Drop to fill it up',
      run(a, b) { view.burst(b.id, 'steam', 3.5); Sound.gurgle(8); setTimeout(() => Sound.pour(), 500); view.burst(a.id, 'steam', 4); toast('<span>Fresh cup, still steaming ☕</span>', 1500); discover('barista'); } },
    { from: a => CAT[a.t].group === 'plants', to: b => CAT[b.t].tap === 'sink', hint: 'Drop to water it',
      run(a) { Sound.water(); view.burst(a.id, 'drip', 2); view.sparkle(view.itemPoint(a.id, [4, 12, 4]), 0xa8f0a0, 12); toast('<span>Watered! It perks right up</span>', 1400); } },
    { from: a => a.t === 'vinyl', to: b => CAT[b.t].tap === 'mood' || (CAT[b.t].tap === 'music' && CAT[b.t].anim === 'record'), hint: 'Drop to play this record',
      run(a, b) { const name = Sound.setMood(a.c | 0); meta.mood = Sound.mood; meta.moodSet = true; moodsPlayed.add(Sound.mood); if (moodsPlayed.size >= 3) discover('mixtape'); if (!meta.music) setMusic(true); else saveMeta(); Sound.needle(); view.excite(b.id); toast(`<span>Now playing: ${name}</span>`, 1600); discover('lofi'); } },
    { from: a => a.t === 'treats', to: b => b.t === 'cat', hint: 'Drop to give a treat',
      run(a, b) { view.feedCat(b.id); Sound.crunch(); Sound.purr(true); setTimeout(() => Sound.purr(false), 2400); toast(`<span>${nameOf(b)} munches happily ♥</span>`, 1500); discover('feast'); } },
    { from: a => a.t === 'blanket', to: b => !!CAT[b.t].nap && !b.p && !b.blanket, hint: 'Drop to tuck it in',
      run(a, b) { pushUndo(); b.blanket = true; room.remove(a.id); changed(); view.poof(b.id, [0xc8484a, 0xf4e8d4]); Sound.place(); toast('<span>All tucked in. Naps here last longer</span>', 1600); } },
    { from: a => a.t === 'fishfood', to: b => !!CAT[b.t].tank, hint: 'Drop to feed the fish',
      run(a, b) { if (!view.feedFish(b.id)) view.excite(b.id); Sound.plop(); toast('<span>Dinner time for the fish!</span>', 1300); discover('fish'); } },
  ];
  function comboAt(cx, cy, d) {
    const a = room.get(d.id);
    if (!a) return null;
    const hit = view.pickItem(cx, cy, [d.id, ...room.descendants(d.id).map(i => i.id)]);
    if (!hit || hit.behindWall) return null;
    for (let b = room.get(hit.id), k = 0; b && k < 2; b = b.p ? room.get(b.p) : null, k++) {
      const c = COMBOS.find(c => c.from(a) && c.to(b));
      if (c) return { c, b };
    }
    return null;
  }
  function moveEdit(e) {
    const d = state.drag;
    if (!d) return;
    if (d.kind === 'move') {
      const combo = comboAt(e.clientX, e.clientY, d);
      if ((combo && combo.b.id) !== (d.combo && d.combo.b.id)) {
        d.combo = combo;
        view.setHover(combo ? combo.b.id : 0, 0x9ae8ff);
        if (combo) { view.setGhost(null); toast(`<span>${combo.c.hint}</span>`, 1000, true); haptic(4); }
      }
      if (combo) return;
    }
    const base = d.kind === 'add' ? d.base : d.base;
    const cand = candidate(e.clientX, e.clientY, base, d.kind === 'move' ? d.grab : null);
    if (!cand) return;
    d.cand = cand;
    view.setGhost(cand, room.canPlace(cand, d.kind === 'move' ? d.id : undefined), room);
  }
  function endEdit() {
    const d = state.drag;
    state.drag = null;
    if (!d) return;
    view.setGhost(null);
    if (d.kind === 'add') {
      if (d.cand && room.canPlace(d.cand)) {
        pushUndo();
        const it = room.add(room.make(d.cand.t, d.cand));
        changed();
        view.boing(it.id); view.poof(it.id, [0xffffff, 0xfff0d0]);
        Sound.place(weightOf(it)); haptic(8);
        if (it.t === 'cat') toast(`<span>Say hi to ${(CATS[it.c] || CATS[0]).name}!</span>`, 1600);
      } else { Sound.nope(); toast('<span>That spot is taken</span>', 1100); }
    } else if (d.kind === 'move' && d.combo) {
      setHidden(0); view.setHover(0);
      const a = room.get(d.id);
      if (a && room.get(d.combo.b.id)) { toastQ.length = 0; toastBusy = 0; d.combo.c.run(a, d.combo.b); view.boing(d.combo.b.id); haptic(8); }
    } else if (d.kind === 'move') {
      setHidden(0);
      const it = room.get(d.id);
      if (it && d.cand && room.canPlace(d.cand, d.id)) {
        const same = ['x', 'z', 'k', 'u', 'e', 'p', 'lx', 'lz'].every(k => d.cand[k] === d.base[k] || (d.cand[k] == null && d.base[k] == null));
        if (!same) { pushUndo(); applyPlacement(it, d.cand); changed(); Sound.place(weightOf(it)); view.boing(it.id); haptic(6); }
      } else if (d.cand) { Sound.nope(); toast('<span>That spot is taken</span>', 1100); }
    }
  }
  function tapEdit(id) {
    const it = room.get(id);
    if (!it) return;
    const C = CAT[it.t];
    if (state.tool === 'remove') {
      pushUndo();
      view.poof(id, [0xf4e6d0, 0xffffff, 0xd8c8b8]);
      const gone = room.remove(id);
      changed(); Sound.poof(); haptic(8);
      if (gone.length > 1) toast(`<span>Put away ${C.name.toLowerCase()} and ${gone.length - 1} thing${gone.length > 2 ? 's' : ''} on it</span>`, 1600);
    } else if (state.tool === 'paint') {
      pushUndo();
      it.c = ((it.c | 0) + 1) % C.vars.length;
      changed(); view.boing(id); Sound.tick2(); haptic(5);
      if (it.t === 'cat') toast(`<span>This is ${(CATS[it.c] || CATS[0]).name}</span>`, 1300);
    } else if (state.tool === 'turn') {
      if (C.kind === 'wall') { toast('<span>Wall pieces stay flat against the wall</span>', 1300); Sound.nope(); return; }
      pushUndo();
      if (C.kind === 'small' || C.kind === 'pet') { it.r = ((it.r || 0) + 1) % 4; changed(); view.boing(id); Sound.turn(); return; }
      const [fw, fd] = fp(it), cx = it.x + fw / 2, cz = it.z + fd / 2;
      const nr = ((it.r || 0) + 1) % 4, t = Object.assign({}, it, { r: nr }), [nw, nd] = fp(t);
      const tries = [[0, 0], [0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]];
      for (const [ox, oz] of tries) {
        t.x = Math.round(cx - nw / 2) + ox; t.z = Math.round(cz - nd / 2) + oz;
        if (room.canPlace(t, it.id)) { it.r = nr; it.x = t.x; it.z = t.z; changed(); view.boing(id); Sound.turn(); haptic(5); return; }
      }
      undo.pop(); Sound.nope(); toast('<span>No room to turn it here</span>', 1200);
    } else if (state.tool === 'move') {
      // handled on drag
    }
  }

  function startOrbit(e, tapId) {
    orbit = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), tapId: tapId || 0, moved: false };
  }
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    Sound.init(); if (Sound.ctx && Sound.ctx.state === 'suspended' && Sound.on) Sound.ctx.resume();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    closeSheets();
    if (pointers.size === 2) {
      // second finger: a camera gesture, so drop whatever the first finger started
      if (state.drag) { if (state.drag.kind === 'move') setHidden(0); state.drag = null; view.setGhost(null); }
      orbit = null;
      const [a, b] = [...pointers.values()];
      gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, zoom: view.zoomGoal };
      return;
    }
    if (pointers.size > 2) return;
    if (e.button === 2 || e.button === 1 || e.altKey) { orbit = { x: e.clientX, y: e.clientY, pan: e.button === 1 }; return; }
    if (state.mode === 'explore') {
      const hit = view.pickItem(e.clientX, e.clientY);
      startOrbit(e, hit && !hit.behindWall ? hit.id : 0);
      return;
    }
    beginEdit(e);
  });
  canvas.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture && pointers.size >= 2 && view.fp) return;
    if (gesture && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      view.zoomGoal = Math.max(0.7, Math.min(room.n > 14 ? 4.5 : 3, gesture.zoom * d / gesture.d));
      let da = ang - gesture.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      view.yawGoal -= da; gesture.ang = ang;
      panBy(mx - gesture.mx, my - gesture.my); gesture.mx = mx; gesture.my = my;
      return;
    }
    if (orbit) {
      const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
      if (!orbit.moved && orbit.sx !== undefined && Math.hypot(e.clientX - orbit.sx, e.clientY - orbit.sy) < 8) return;
      orbit.moved = true;
      orbit.x = e.clientX; orbit.y = e.clientY;
      if (view.fp) { view.fp.look -= dx * 0.006; view.fp.pitch = Math.max(-0.9, Math.min(0.75, view.fp.pitch + dy * 0.005)); }   // look around
      else if (orbit.pan) panBy(dx, dy);
      else { view.yawGoal -= dx * 0.008; view.pitchGoal = Math.max(0.3, Math.min(1.2, view.pitchGoal + dy * 0.005)); }
      return;
    }
    if (state.drag) { moveEdit(e); return; }
    // desktop: preview the piece under the mouse, outline what a tool would act on
    if (e.pointerType === 'mouse' && !pointers.size) { mouse = { x: e.clientX, y: e.clientY }; hoverSoon(); }
  });
  let mouse = null, hoverT = 0;
  function hoverSoon() {
    if (hoverT) return;
    hoverT = requestAnimationFrame(() => { hoverT = 0; updateHover(); });
  }
  function refreshGhost() { if (mouse) updateHover(); }
  function updateHover() {
    if (!mouse || state.drag || orbit) return;
    if (state.mode === 'edit' && state.tool === 'add') {
      const C = CAT[state.add];
      const cand = candidate(mouse.x, mouse.y, { t: state.add, c: state.add === 'cat' ? room.count(i => i.t === 'cat' && !i.visitor) % 5 : 0, r: state.addR || 0, on: C.on !== undefined ? C.on : false });
      if (cand) view.setGhost(cand, room.canPlace(cand), room); else view.setGhost(null);
      view.setHover(0); canvas.style.cursor = cand ? 'crosshair' : 'grab';
      return;
    }
    const hit = view.pickItem(mouse.x, mouse.y);
    const id = hit && !hit.behindWall ? hit.id : 0;
    if (state.mode === 'edit') {
      view.setHover(id, state.tool === 'remove' ? 0xff6a6a : state.tool === 'paint' ? 0x9ae8ff : 0xffffff);
      canvas.style.cursor = id ? (state.tool === 'move' ? 'grab' : 'pointer') : 'grab';
    } else {
      view.setHover(0);
      const it = id && room.get(id);
      canvas.style.cursor = it && CAT[it.t].tap ? 'pointer' : 'grab';
    }
  }
  const up = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) gesture = null;
    if (orbit && orbit.t0 && e.type === 'pointerup' && pointers.size === 0 && !orbit.moved && performance.now() - orbit.t0 < 450) {
      if (orbit.tapId) {
        if (state.mode === 'explore') interact(orbit.tapId); else tapEdit(orbit.tapId);
        lastTap = null;
      } else if (state.mode === 'explore' && view.fp) {
        const p = view.pickFloor(e.clientX, e.clientY);
        if (p && view.walkCatTo(view.fp.id, Math.floor(p.x), Math.floor(p.z))) { const P = view.pets.get(view.fp.id); if (P) P.manual = 0; }
      } else if (state.mode === 'explore' && follow && performance.now() < follow.until) {
        const p = view.pickFloor(e.clientX, e.clientY);
        if (p && view.walkCatTo(follow.id, Math.floor(p.x), Math.floor(p.z))) { follow.until = performance.now() + 6000; view.sparkle(new THREE.Vector3(Math.floor(p.x) + 0.5, 0.1, Math.floor(p.z) + 0.5), 0xffd0e0, 6); }
      } else if (state.mode === 'explore') {
        const now = performance.now();
        if (lastTap && now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { zoomToward(e.clientX, e.clientY); lastTap = null; }
        else lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    }
    if (pointers.size === 0) { orbit = null; if (e.type === 'pointerup') endEdit(); else if (state.drag) { if (state.drag.kind === 'move') setHidden(0); state.drag = null; view.setGhost(null); } }
  };
  function zoomToward(cx, cy) {
    const p = view.pickFloor(cx, cy);
    if (!p || view.zoomGoal > 2.2 || p.x < 0 || p.z < 0 || p.x > room.n || p.z > room.n) { view.zoomGoal = 1; view.panGoal.set(0, 0, 0); return; }
    view.panGoal.set(p.x - room.n / 2, 0, p.z - room.n / 2);
    view.zoomGoal = Math.min(room.n > 14 ? 4.5 : 3, view.zoomGoal * 1.7);
    haptic(5);
  }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !state.drag) { view.setGhost(null); view.setHover(0); mouse = null; } });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (view.fp) { view.fpCam.fov = Math.max(45, Math.min(90, view.fpCam.fov + e.deltaY * 0.03)); view.placeCamera(); return; }
    view.zoomGoal = Math.max(0.7, Math.min(room.n > 14 ? 4.5 : 3, view.zoomGoal * Math.exp(-e.deltaY * 0.0015)));
  }, { passive: false });

  function panBy(dx, dy) {
    const cam = view.cam;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const upv = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const s = 1 / (view.ppu * view.zoom);
    view.panGoal.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
    if (view.panGoal.length() > room.n * 0.8) view.panGoal.setLength(room.n * 0.8);
  }

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doUndo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // leave browser shortcuts like Ctrl+R alone
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (view.fp) {   // cat view: WASD or the arrows walk, Q/E look around, C or Esc goes back
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) { e.preventDefault(); held.add(key); return; }
      if (key === 'q') { view.fp.look += 0.35; return; }
      if (key === 'e') { view.fp.look -= 0.35; return; }
      if (key === 'Escape' || key === 'c') { exitCat(); return; }
      if (key === 'n') { nextCat(); return; }
    } else if (key === 'c' && state.mode === 'explore') { enterCat(); return; }
    const trayOpen = tray.classList.contains('open');
    const keys = { 1: 'add', 2: 'move', 3: 'turn', 4: 'paint', 5: 'remove' };
    if (keys[key]) { if (state.mode === 'explore') setMode('edit', true); document.querySelector(`.tools [data-tool="${keys[key]}"]`).click(); }
    else if (key === 'ArrowRight' && trayOpen) { e.preventDefault(); stepTray(1); }
    else if (key === 'ArrowLeft' && trayOpen) { e.preventDefault(); stepTray(-1); }
    else if ((key === 'ArrowDown' || key === ']') && trayOpen) { e.preventDefault(); stepTab(1); }
    else if ((key === 'ArrowUp' || key === '[') && trayOpen) { e.preventDefault(); stepTab(-1); }
    else if (key === 'r') turnKey();
    else if ((key === 'Delete' || key === 'Backspace') && state.mode === 'edit' && view.hoverId) { const t = state.tool; state.tool = 'remove'; tapEdit(view.hoverId); state.tool = t; view.setHover(0); refreshGhost(); }
    else if (key === 'x') setMode(state.mode === 'explore' ? 'edit' : 'explore');
    else if (key === 'g') surprise();
    else if (key === 'q') rotate(-1);
    else if (key === 'e') rotate(1);
    else if (key === 'm') setMusic(!meta.music);
    else if (key === 'u') doUndo();
    else if (key === '?' || key === 'h') { $('#bMenu').click(); }
    else if (key === 'Escape') {
      if (state.drag) { if (state.drag.kind === 'move') setHidden(0); state.drag = null; view.setGhost(null); }
      else if (sheet.classList.contains('open') || $('#photo').classList.contains('open')) { closeSheets(); $('#photo').classList.remove('open'); }
      else if (state.mode === 'edit') setMode('explore');
    }
  });
  // R: spin the piece you're about to place, or the one under the mouse
  function turnKey() {
    if (state.mode === 'edit' && state.tool === 'add') {
      const C = CAT[state.add];
      if (C.kind === 'wall') { toast('<span>Wall pieces stay flat against the wall</span>', 1200); return; }
      state.addR = ((state.addR || 0) + 1) % 4; Sound.turn(); refreshGhost();
      return;
    }
    if (state.mode === 'edit' && view.hoverId) { const t = state.tool; state.tool = 'turn'; tapEdit(view.hoverId); state.tool = t; refreshGhost(); return; }
    rotate(1);
  }

  function rotate(dir) {
    const q = Math.PI / 2;
    view.yawGoal = Math.round((view.yawGoal - Math.PI / 4) / q) * q + Math.PI / 4 + dir * q;
    Sound.turn();
  }
  $('#rotL').onclick = () => rotate(-1);
  $('#rotR').onclick = () => rotate(1);
  $('#bUndo').onclick = doUndo;

  // ---------------------------------------------------------------
  // Time and weather
  const PHASE_ORDER = ['morning', 'day', 'evening', 'night'];
  const PHASE_NAMES = { morning: 'Morning', day: 'Afternoon', evening: 'Evening', night: 'Night' };
  function setPhase(p, quiet) {
    if (p === meta.phase && view.env.phase === p) return;
    meta.phase = p; saveMeta();
    view.setPhase(p); view.refreshEnv(p);
    if (meta.mood === 'auto') applyMood();
    updateHeader();
    if (!quiet) toast(`<span>${PHASE_NAMES[p]}${meta.realtime ? '' : ' · Settings has “Follow the clock”'}</span>`, 1300);
    setTimeout(checkRoomMoments, 2600);
  }
  $('#bTime').onclick = () => { meta.realtime = false; setPhase(PHASE_ORDER[(PHASE_ORDER.indexOf(meta.phase) + 1) % 4]); Sound.turn(); };
  // weather: tap to cycle clear, rain, storm, snow and sakura
  const WEATHERS = ['clear', 'rain', 'storm', 'snow', 'sakura'];
  const WEATHER_ICON = {
    clear: '<path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 6.5 4 4 0 0 1 17 15z" fill="currentColor" fill-opacity=".15"/>',
    rain: '<path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 6.5 4 4 0 0 1 17 15z" fill="currentColor" fill-opacity=".15"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
    storm: '<path d="M7 14a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 5.5 4 4 0 0 1 17 14z" fill="currentColor" fill-opacity=".3"/><path d="M12.5 14l-2 4h3l-2 4" stroke-linejoin="round"/>',
    snow: '<path d="M7 14a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 5.5 4 4 0 0 1 17 14z" fill="currentColor" fill-opacity=".15"/><path d="M8 18v.01M12 20v.01M16 18v.01M10 21.5v.01M14 21.5v.01" stroke-width="2.6"/>',
    sakura: '<g fill="currentColor" stroke="none"><ellipse cx="12" cy="6.5" rx="2.6" ry="3.6"/><ellipse cx="12" cy="6.5" rx="2.6" ry="3.6" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.5" rx="2.6" ry="3.6" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.5" rx="2.6" ry="3.6" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.5" rx="2.6" ry="3.6" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="1.6" fill="#fff" stroke="none"/>',
  };
  const WEATHER_SAY = { clear: 'Clear skies', rain: 'Rain on the window…', storm: 'A storm rolls in', snow: 'It’s snowing', sakura: 'Cherry blossoms drifting by' };
  function applyWeather(w, quiet) {
    meta.weather = WEATHERS.includes(w) ? w : 'clear';
    meta.raining = meta.weather === 'rain' || meta.weather === 'storm';
    view.setWeather(meta.weather); view.setRain(meta.raining); view.refreshEnv(meta.phase);
    if (meta.mood === 'auto') applyMood();
    document.body.classList.toggle('raining', meta.raining);
    $('#bRain svg').innerHTML = WEATHER_ICON[meta.weather];
    $('#bRain').setAttribute('aria-label', 'Weather: ' + meta.weather);
    if (quiet) return;
    saveMeta(); Sound.init(); updateHeader();
    toast(`<span>${WEATHER_SAY[meta.weather]}</span>`, 1400, true);
    if (meta.raining) discover('rain');
    if (meta.weather === 'storm') setTimeout(() => view.strike(), 900);
    if (meta.weather === 'sakura') discover('hanami');
  }
  $('#bRain').onclick = () => applyWeather(WEATHERS[(WEATHERS.indexOf(meta.weather || 'clear') + 1) % WEATHERS.length]);
  $('#bMusic').onclick = () => setMusic(!meta.music);

  // ---------------------------------------------------------------
  // Rooms list & menu
  const sheet = $('#sheet');
  function closeSheets() { if (sheet.classList.contains('open')) Sound.slide(false); sheet.classList.remove('open'); }
  $('#bMenu').onclick = () => { renderMenu(); sheet.classList.add('open'); Sound.slide(true); };
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheets(); });
  $('#brand').onclick = () => {
    const name = prompt('Name this room', room.name);
    if (name && name.trim()) { room.name = name.trim().slice(0, 40); updateHeader(); dirty = true; saveIndex(); }
  };

  // template cards, rooms first and open-air scenes after, each under a little heading
  function presetCards(onPick) {
    const wrap = document.createElement('div'); wrap.className = 'cards';
    const head = text => { const h = document.createElement('h3'); h.textContent = text; wrap.appendChild(h); };
    const card = (k, p) => {
      const b = document.createElement('button'); b.className = 'card ' + k;
      b.innerHTML = `<div class="art">${p.scene ? '<em class="tag">Scene</em>' : ''}</div><b>${p.name}</b><span>${p.blurb}</span>`;
      if (p.art) b.querySelector('.art').style.background = p.art;   // packs give their own card colours
      b.onclick = () => onPick(k);
      wrap.appendChild(b);
    };
    const all = Object.entries(PRESETS);
    head('Rooms');
    const rb = document.createElement('button'); rb.className = 'card random';
    rb.innerHTML = `<div class="art">🎲</div><b>Surprise me</b><span>A brand-new random room every time.</span>`;
    rb.onclick = () => onPick('random');
    wrap.appendChild(rb);
    all.filter(([, p]) => !p.scene).forEach(([k, p]) => card(k, p));
    head('Scenes');
    all.filter(([, p]) => p.scene).forEach(([k, p]) => card(k, p));
    return wrap;
  }
  function fillRoom(k) {
    if (k === 'random') { room.n = LR.N; room.generate((Math.random() * 0xffffffff) >>> 0); }
    else { PRESETS[k].make(room); room.name = PRESETS[k].name; }
  }
  function newRoom(k, forcedId) {
    save();
    const id = forcedId || Date.now();
    fillRoom(k);
    rooms.push({ id, name: room.name, n: room.items.length });
    meta.current = id; undo.length = 0;
    view.panGoal.set(0, 0, 0); view.zoomGoal = 1;
    changed(); save(); saveIndex(); saveMeta(); updateHeader();
    toast(`<b>${room.name}</b><span>A fresh room. Your other rooms are in the menu.</span>`, 2400);
    Sound.stamp(); setTimeout(() => Sound.arpeggio(), 250);
  }
  // share codes: a room squeezed into a short text a friend can paste in
  const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function squeeze(bytes, how) {
    const stream = new Blob([bytes]).stream().pipeThrough(how === 'in' ? new CompressionStream('deflate-raw') : new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function roomCode() {
    const d = room.serialize(); delete d.seed;
    d.items = d.items.map(i => { const o = Object.assign({}, i); if (!o.c) delete o.c; if (!o.r) delete o.r; if (!o.on) delete o.on; return o; });   // drop the defaults
    const raw = new TextEncoder().encode(JSON.stringify(d));
    if (typeof CompressionStream === 'undefined') return 'LR0.' + b64u(raw);
    return 'LR1.' + b64u(await squeeze(raw, 'in'));
  }
  async function readCode(code) {
    const m = String(code).trim().match(/^LR([01])\.([A-Za-z0-9_-]+)$/);
    if (!m) throw new Error('not a room code');
    const bytes = unb64u(m[2]);
    const d = JSON.parse(new TextDecoder().decode(m[1] === '1' ? await squeeze(bytes, 'out') : bytes));
    d.items.forEach(i => { ['c', 'r'].forEach(k => { if (i[k] == null) i[k] = 0; }); if (i.on == null) i.on = false; });
    return d;
  }
  function codeSheet(title, sub, build) {
    const body = $('#sheetBody'); body.innerHTML = '';
    const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; body.appendChild(el); return el; };
    h('div', 'grab'); h('h2', '', title); h('p', 'muted', sub);
    build(h); sheet.classList.add('open');
  }
  async function shareSheet() {
    const code = await roomCode();
    codeSheet(`Share “${room.name}”`, 'Send this code to a friend. They tap “Open a friend’s code” in their menu and paste it.', h => {
      const ta = h('textarea', 'code'); ta.readOnly = true; ta.value = code; ta.rows = 4;
      h('p', 'muted small', `${code.length} characters`);
      const row = h('div', 'rowbtns');
      row.innerHTML = '<button class="chipbtn" id="bCopyCode">Copy</button>' + (cap && cap.isNativePlatform && cap.isNativePlatform() || navigator.share ? '<button class="chipbtn" id="bSendCode">Send…</button>' : '');
      row.querySelector('#bCopyCode').onclick = async () => { try { await navigator.clipboard.writeText(code); } catch (e) { ta.select(); document.execCommand('copy'); } toast('<span>Code copied</span>', 1200); Sound.chime(); };
      const send = row.querySelector('#bSendCode');
      if (send) send.onclick = async () => {
        try {
          if (cap && cap.isNativePlatform && cap.isNativePlatform()) await cap.registerPlugin('Share').share({ title: 'My Lofi Room', text: `Come see my Lofi Room! Paste this code in the app: ${code}` });
          else await navigator.share({ title: 'My Lofi Room', text: code });
        } catch (e) { /* cancelled */ }
      };
      ta.onclick = () => ta.select();
    });
  }
  function importSheet() {
    codeSheet('Open a friend’s room', 'Paste a room code. It opens as a new room, so nothing of yours is replaced.', h => {
      const ta = h('textarea', 'code'); ta.rows = 4; ta.placeholder = 'LR1.…';
      const row = h('div', 'rowbtns'); row.innerHTML = '<button class="chipbtn" id="bOpenCode">Open room</button>';
      row.querySelector('#bOpenCode').onclick = async () => {
        try {
          const d = await readCode(ta.value);
          const probe = new LR.Room();
          if (!probe.load(d)) throw new Error('bad room');
          probe.items = probe.items.filter(i => CAT[i.t]);   // pieces this version doesn't know are skipped
          save();
          const id = Date.now();
          room.load(probe.serialize());
          rooms.push({ id, name: room.name, n: room.items.length });
          meta.current = id; undo.length = 0;
          view.panGoal.set(0, 0, 0); view.zoomGoal = 1;
          changed(); save(); saveIndex(); saveMeta(); updateHeader(); closeSheets();
          toast(`<b>${room.name}</b><span>A friend’s room, now in your list</span>`, 2200); Sound.stamp(); setTimeout(() => Sound.arpeggio(), 250);
        } catch (e) { Sound.nope(); toast('<span>That code doesn’t look right</span>', 1600); }
      };
    });
  }
  // linked rooms: a door opens onto another saved room, and the rooms become a tiny apartment
  const isPortal = it => CAT[it.t] && CAT[it.t].tap === 'portal';
  const roomTitle = id => { const r = rooms.find(x => x.id === id); return r ? r.name : 'another room'; };
  // the cell you stand in to go through a door, and the way you face to walk into it
  function doorFront(it, k) {
    const n = room.n, u = it.u + (k || 0);   // k: which cell along a wide door
    if (CAT[it.t].kind === 'wall') return [[u, 0, Math.PI], [0, n - 1 - u, -Math.PI / 2], [n - 1 - u, n - 1, 0], [n - 1, u, Math.PI / 2]][it.k];
    const d = [[0, 1], [1, 0], [0, -1], [-1, 0]][(it.r || 0) & 3];   // a doorway faces +z, turned by r
    return [it.x + d[0], it.z + d[1], Math.atan2(-d[0], -d[1])];
  }
  // make sure the room we just walked into has a door leading back
  function backDoor(from, hint) {
    let back = room.items.find(i => isPortal(i) && i.link === from) || room.items.find(i => isPortal(i) && !i.link);
    const open = WALLS[room.wall.style] && WALLS[room.wall.style].none;
    const tryAdd = d => (room.canPlace(d) ? room.add(d) : null);
    if (!back && !open) {
      const t = hint && hint.t && CAT[hint.t] && CAT[hint.t].kind === 'wall' ? hint.t : 'roomdoor', c = hint && hint.t === t ? hint.c || 0 : 0;   // same style as the door you came through
      if (hint && hint.k != null) back = tryAdd(room.make(t, { k: hint.k, u: Math.min(hint.u, room.n - CAT[t].size[0]), e: 0, c, link: from }));
      for (let k = 0; !back && k < 2; k++) for (let u = 1; !back && u < room.n - CAT[t].size[0]; u++) back = tryAdd(room.make(t, { k, u, e: 0, c, link: from }));
      for (let k = 0; !back && k < 2; k++) for (let u = 1; !back && u < room.n - 1; u++) back = tryAdd(room.make('roomdoor', { k, u, e: 0, link: from }));
    }
    if (!back) for (let x = 1; !back && x < room.n - 1; x++) for (let z = 0; !back && z < room.n - 2; z++) { const g = room.make('roomgate', { x, z, link: from }); if (view.cellFree(x, z + 1) || !view.walk) back = tryAdd(g); }
    if (back && !back.link) back.link = from;
    return back;
  }
  let travelling = false;
  function walkThrough(door, to, asCat) {
    if (travelling) return;
    travelling = true;
    const from = meta.current, hint = CAT[door.t].kind === 'wall' ? { k: door.k, u: door.u, t: door.t, c: door.c } : null;
    view.openDoor(door.id); Sound.creak();
    toast(`<span>Into ${roomTitle(to)}…</span>`, 900, true);
    setTimeout(() => $('#fade').classList.add('on'), 420);
    setTimeout(() => {
      switchRoom(to, true);
      const back = backDoor(from, hint);
      changed(); save();
      $('#fade').classList.remove('on');
      if (back) setTimeout(() => view.openDoor(back.id), 200);
      discover('openhouse');
      // walking as a cat: arrive as that cat in the doorway on the other side
      if (asCat != null && back) {
        const [fx, fz, face] = doorFront(back);
        const cat = room.add(room.make('cat', { x: Math.max(0, Math.min(room.n - 1, fx)), z: Math.max(0, Math.min(room.n - 1, fz)), c: asCat.c, name: asCat.name, visitor: true, explorer: true }));
        changed();
        setTimeout(() => { const P = view.pets.get(cat.id); if (P) P.heading = face + Math.PI; enterCat(cat.id); discover('wanderer'); travelling = false; }, 60);
      } else travelling = false;
    }, 820);
  }
  // in cat view, walking into a door's doorway takes you through it
  let doorNear = 0, doorCool = 0;
  function catDoors(now) {
    if (!view.fp || travelling || now < doorCool) return;
    const P = view.pets.get(view.fp.id), me = room.get(view.fp.id);
    if (!P || !me) return;
    const cx = Math.floor(P.x), cz = Math.floor(P.z);
    const span = i => (CAT[i.t].kind === 'wall' ? CAT[i.t].size[0] : 1);
    const d = room.items.find(i => isPortal(i) && Array.from({ length: span(i) }, (_, k) => doorFront(i, k)).some(([x, z]) => x === cx && z === cz));
    if (!d) { doorNear = 0; return; }
    if (doorNear !== d.id) { doorNear = d.id; toast(`<span>${d.link && rooms.some(r => r.id === d.link) ? `Door to ${roomTitle(d.link)}` : 'A door to somewhere new'}</span>`, 1200, true); }
    const face = doorFront(d)[2];
    let dh = P.heading - face; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
    if (Math.abs(dh) < 0.8 && (P.manual > view.t || P.state === 'walk')) {
      doorCool = now + 1500;
      if (d.link && rooms.some(r => r.id === d.link)) walkThrough(d, d.link, { c: me.c, name: me.name });
      else doorPicker(d);
    }
  }
  function doorPicker(door, relink) {
    const body = $('#sheetBody'); body.innerHTML = '';
    const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; body.appendChild(el); return el; };
    h('div', 'grab'); h('h2', '', 'Where does this door go?');
    h('p', 'muted', 'Pick one of your rooms, or start a new one. Walking through brings you back the same way.');
    const list = h('div', 'cards');
    const me = view.fp && room.get(view.fp.id), asCat = me ? { c: me.c, name: me.name } : null;
    const link = id => { pushUndo(); door.link = id; changed(); save(); closeSheets(); if (relink) toast(`<span>This door now goes to ${roomTitle(id)}</span>`, 1500); else walkThrough(door, id, asCat); };
    rooms.filter(r => r.id !== meta.current).forEach(r => {
      const b = document.createElement('button'); b.className = 'card room';
      b.innerHTML = `<div class="art">🚪</div><b>${r.name}</b><span>${r.n} thing${r.n === 1 ? '' : 's'}</span>`;
      b.onclick = () => link(r.id); list.appendChild(b);
    });
    const nb = document.createElement('button'); nb.className = 'card random';
    nb.innerHTML = `<div class="art">✨</div><b>A new room</b><span>An empty room through this door.</span>`;
    nb.onclick = () => {
      const from = meta.current, id = Date.now();
      pushUndo(); door.link = id; save(); closeSheets();
      exitCat(true);
      newRoom('blank', id);
      backDoor(from, CAT[door.t].kind === 'wall' ? { k: door.k, u: door.u, t: door.t, c: door.c } : null);
      changed(); save(); discover('openhouse');
    };
    list.appendChild(nb);
    sheet.classList.add('open');
  }
  function switchRoom(id) {
    if (id === meta.current) return;
    exitCat(true);
    save();
    if (!loadRoom(id)) { toast('<span>Couldn’t open that room</span>', 1500); return; }
    undo.length = 0; saveMeta();
    view.panGoal.set(0, 0, 0); view.zoomGoal = 1;
    changed(); updateHeader();
    toast(`<b>${room.name}</b>`, 1200); Sound.turn();
  }
  function deleteRoom(id) {
    if (rooms.length < 2) { toast('<span>Keep at least one room</span>', 1400); return; }
    const r = rooms.find(x => x.id === id);
    if (!confirm(`Delete “${r ? r.name : 'this room'}”? This can’t be undone.`)) return;
    rooms = rooms.filter(x => x.id !== id);
    store.del('lr.room.' + id);
    if (id === meta.current) { loadRoom(rooms[0].id); undo.length = 0; changed(); updateHeader(); }
    saveIndex(); saveMeta(); renderMenu();
  }
  function renderMenu() {
    saveIndex();
    const body = $('#sheetBody');
    body.innerHTML = '';
    const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; body.appendChild(el); return el; };
    h('div', 'grab');
    h('h2', '', `Your rooms <small>${rooms.length}</small>`);
    const list = h('div', 'cards');
    rooms.forEach(r => {
      const b = document.createElement('button'); b.className = 'card room' + (r.id === meta.current ? ' cur' : '');
      const d = r.id === meta.current ? room.serialize() : store.get('lr.room.' + r.id, null);
      if (d) {
        b.style.setProperty('--a', LR.hex(WALLS[d.wall.style] ? WALLS[d.wall.style].fn((WALL_COLORS[d.wall.color] || WALL_COLORS[0])[1], 70, 30) : 0xf2e6d0));
        b.style.setProperty('--b', LR.hex(FLOORS[d.floor.style] ? FLOORS[d.floor.style].fn(70, 70) : 0xd8b48a));
      }
      b.innerHTML = `<div class="art"></div><b>${r.name}</b><span>${r.id === meta.current ? 'Open now · ' : ''}${r.n} thing${r.n === 1 ? '' : 's'}</span>`;
      b.onclick = () => { closeSheets(); switchRoom(r.id); };
      if (rooms.length > 1) {
        const x = document.createElement('i'); x.className = 'x'; x.textContent = '✕'; x.setAttribute('role', 'button'); x.setAttribute('aria-label', 'Delete room');
        x.onclick = ev => { ev.stopPropagation(); deleteRoom(r.id); };
        b.appendChild(x);
      }
      list.appendChild(b);
    });
    // the house map: which rooms connect to which, with a tap to travel
    const links = rooms.map(r => {
      const d = r.id === meta.current ? room.serialize() : store.get('lr.room.' + r.id, null);
      const doors = d && Array.isArray(d.items) ? d.items.filter(i => CAT[i.t] && CAT[i.t].tap === 'portal') : [];
      return { r, doors };
    });
    if (links.some(l => l.doors.length)) {
      h('h2', '', 'Your house');
      const map = h('div', 'house');
      links.forEach(({ r, doors }) => {
        const row = document.createElement('div'); row.className = 'hroom' + (r.id === meta.current ? ' here' : '');
        row.innerHTML = `<b>${r.name}${r.id === meta.current ? ' <small>you are here</small>' : ''}</b>`;
        const chips = document.createElement('div'); chips.className = 'hdoors';
        if (!doors.length) chips.innerHTML = '<span class="muted small">No doors yet</span>';
        doors.forEach(dd => {
          const to = rooms.find(x => x.id === dd.link);
          const c = document.createElement('button'); c.className = 'hdoor';
          c.textContent = to ? `🚪 ${to.name}` : '🚪 not set';
          c.onclick = () => {
            if (r.id === meta.current) { const live = room.get(dd.id); closeSheets(); if (live) { if (to) walkThrough(live, to.id); else doorPicker(live); } return; }
            closeSheets(); switchRoom(to ? to.id : r.id);
          };
          chips.appendChild(c);
          if (r.id === meta.current) {
            const e = document.createElement('button'); e.className = 'hdoor edit'; e.textContent = 'Change'; e.title = 'Change where this door goes';
            e.onclick = () => { const live = room.get(dd.id); if (live) doorPicker(live, true); };
            chips.appendChild(e);
          }
        });
        row.appendChild(chips); map.appendChild(row);
      });
      h('p', 'muted small', 'Add a door from the Doors tab in Decorate (the free-standing doorway works anywhere, even outside). As a cat, just walk through.');
    }
    const sh = h('div', 'rowbtns');
    sh.innerHTML = '<button class="chipbtn" id="bShareCode">Share this room as a code</button><button class="chipbtn" id="bImportCode">Open a friend’s code</button>';
    sh.querySelector('#bShareCode').onclick = () => shareSheet();
    sh.querySelector('#bImportCode').onclick = () => importSheet();
    h('h2', '', 'Start a new room');
    h('p', 'muted', 'Your current room is saved and stays in the list above.');
    body.appendChild(presetCards(k => { closeSheets(); newRoom(k); }));
    const D = meta.daily || {}, doneToday = D.date === today();
    h('h2', '', `Today's moment <small>${D.streak ? `${D.streak} day streak` : ''}</small>`);
    h('div', 'disc', `<div class="d${doneToday ? ' got' : ''}"><i>${doneToday ? '✦' : '☀'}</i><div><b>${dailyTask()[1]}</b><span>${doneToday ? 'Done for today. See you tomorrow!' : 'A new one every day'}</span></div></div>`);
    h('h2', '', `Cozy moments <small>${found.size}/${MOMENTS.length}</small>`);
    const dl = h('div', 'disc');
    MOMENTS.forEach(([k, name, desc]) => {
      const got = found.has(k);
      const el = document.createElement('div'); el.className = 'd' + (got ? ' got' : '');
      el.innerHTML = `<i>${got ? '✦' : '?'}</i><div><b>${got ? name : '???'}</b><span>${got ? desc : 'Keep exploring…'}</span></div>`;
      dl.appendChild(el);
    });
    h('h2', '', 'Settings');
    const toggle = (label, on, fn) => {
      const r = h('button', 'toggle' + (on ? ' on' : ''), `<span>${label}</span><i></i>`);
      r.onclick = () => { fn(); renderMenu(); };
    };
    toggle('Sound', Sound.on, () => { Sound.toggle(); meta.sound = Sound.on; saveMeta(); });
    toggle('Vinyl crackle (the soft hiss and pops under the music)', meta.crackle !== false, () => { meta.crackle = meta.crackle === false; Sound.setCrackle(meta.crackle); saveMeta(); });
    toggle('Cat mischief (cats sometimes knock things over)', meta.mischief !== false, () => { meta.mischief = meta.mischief === false; saveMeta(); });
    toggle('Visitors (a neighbour cat drops by)', meta.visitors !== false, () => { meta.visitors = meta.visitors === false; saveMeta(); });
    toggle('Follow the clock (morning, afternoon, evening, night)', meta.realtime, () => { meta.realtime = !meta.realtime; saveMeta(); if (meta.realtime) setPhase(realPhase(), true); });
    h('p', 'muted small', 'Explore: drag to look around, pinch to zoom, double-tap to zoom in, tap lamps, records, plants and cats. Decorate: Add places things (tap or drag), Move drags them, Turn spins them, Paint changes walls, floors and colours, Remove puts things away. Small things like mugs and lamps sit on desks, tables and shelves. On a computer: left-drag or right-drag spins, the wheel zooms (or scrolls the tray when the mouse is over it), middle-drag pans. Keys: 1–5 tools, ←/→ pick from the tray, ↑/↓ switch tabs, R turns the piece you’re placing or the one under the mouse, Delete removes it, Q/E turn the room, X switches Explore/Decorate, G makes a surprise room, M plays music, Ctrl+Z or U undoes, Esc goes back.');
  }

  function showIntro() {
    const intro = $('#intro');
    intro.classList.add('open');
    const cards = $('#introRooms'); cards.innerHTML = '';
    cards.appendChild(presetCards(k => {
      fillRoom(k);
      rooms = [{ id: meta.current, name: room.name, n: room.items.length }];
      undo.length = 0; store.set('lr.intro', true);
      changed(); save(); saveIndex(); saveMeta(); updateHeader();
      intro.classList.remove('open'); Sound.init(); Sound.chime();
    }));
  }
  if (!store.get('lr.intro', false)) showIntro();

  // ---------------------------------------------------------------
  // Photo
  $('#bPhoto').onclick = () => {
    const shot = view.snapshot();
    const img = new Image();
    img.onload = () => {
      // tall phone screens crop to a 4:5 portrait around the room, ready for Instagram
      const dpr = img.height / innerHeight;
      let sh = img.height, sy = 0;
      if (img.height > img.width * 1.25) {
        sh = Math.round(img.width * 1.25);
        sy = Math.max(0, Math.min(img.height - sh, Math.round(img.height / 2 - liftNow * dpr - sh / 2)));
      }
      const c = document.createElement('canvas'); c.width = img.width; c.height = sh;
      const g = c.getContext('2d');
      const cs = getComputedStyle(bg).backgroundImage.match(/rgb[a]?\([^)]+\)|#[0-9a-f]{6}/gi) || ['#f8e8d0', '#d8a77e'];
      const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, cs[0]); gr.addColorStop(1, cs[cs.length - 1]);
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      if (document.body.classList.contains('night')) { const si = new Image(); si.src = stars.style.backgroundImage.slice(5, -2); g.globalAlpha = 0.8; g.drawImage(si, 0, 0, c.width, c.height); g.globalAlpha = 1; }
      g.drawImage(img, 0, -sy);
      const s = c.width / 400;
      g.font = `600 ${Math.round(13 * s)}px Fredoka, sans-serif`; g.fillStyle = document.body.classList.contains('night') ? 'rgba(255,255,255,0.8)' : 'rgba(74,53,48,0.7)';
      g.fillText(room.name + ' · Lofi Rooms', 16 * s, c.height - 18 * s);
      const url = c.toDataURL('image/png');
      $('#photoImg').src = url;
      const dl = $('#photoSave'); if (dl) dl.href = url;
      $('#photo').classList.add('open');
      $('#flash').classList.remove('go'); void $('#flash').offsetWidth; $('#flash').classList.add('go');
      Sound.snap(); discover('photo');
    };
    img.src = shot;
  };
  $('#photoClose').onclick = () => $('#photo').classList.remove('open');
  // in the app, hand the picture to Android's share sheet (Instagram, Photos, Messages…)
  const cap = window.Capacitor;
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    const shareBtn = $('#photoSave');
    shareBtn.textContent = 'Share';
    shareBtn.removeAttribute('download');
    shareBtn.onclick = async e => {
      e.preventDefault();
      try {
        const fsys = cap.registerPlugin('Filesystem'), share = cap.registerPlugin('Share');
        const file = await fsys.writeFile({ path: `lofi-room-${Date.now()}.png`, data: $('#photoImg').src.split(',')[1], directory: 'CACHE' });
        await share.share({ title: 'My Lofi Room', files: [file.uri] });
      } catch (err) {
        if (!/cancel/i.test(String(err && err.message))) toast('<span>Couldn’t open the share sheet</span>', 2000);
      }
    };
    $('#photo p').textContent = 'Share it, or long-press the picture to copy it';
  }

  // ---------------------------------------------------------------
  // Save
  let dirty = fresh;
  function saveMeta() { store.set('lr.meta', meta); }
  function saveIndex() {
    const r = rooms.find(x => x.id === meta.current);
    if (r) { r.name = room.name; r.n = room.items.length; }
    store.set('lr.rooms', rooms);
  }
  function save() {
    try { put('lr.room.' + meta.current, JSON.stringify(room.serialize())); } catch (e) { /* quota */ }
    saveIndex(); saveMeta();
    dirty = false;
  }
  if (fresh) save();
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);

  // ---------------------------------------------------------------
  // Android: back button closes overlays first, pausing saves to disk
  const app = window.Store && window.Store.app;
  if (app) {
    app.addListener('pause', () => { save(); window.Store.flush(); if (Sound.ctx) Sound.ctx.suspend(); });
    app.addListener('resume', () => { if (Sound.ctx && Sound.on) Sound.ctx.resume(); });
    app.addListener('backButton', () => {
      if ($('#photo').classList.contains('open')) $('#photo').classList.remove('open');
      else if (sheet.classList.contains('open')) closeSheets();
      else if (state.mode === 'edit') setMode('explore');
      else { save(); window.Store.flush(); app.minimizeApp(); }
    });
  }

  // ---------------------------------------------------------------
  // Main loop
  let last = performance.now(), t = 0, soundT = 0, saveT = 0, clockT = 0, momentT = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    const liftGoal = state.mode === 'edit' ? (innerWidth < 760 ? 84 : 60) : (innerWidth < 760 ? 24 : 16);
    liftNow += (liftGoal - liftNow) * Math.min(1, dt * 6);
    soundT += dt;
    if (soundT > 0.3) { Sound.soundscape(soundState(soundT)); soundT = 0; }
    clockT += dt;
    if (clockT > 20) { clockT = 0; if (meta.realtime && realPhase() !== meta.phase) setPhase(realPhase()); }
    momentT += dt;
    if (momentT > 2) {
      momentT = 0;
      if (view.petNapping()) discover('catnap');
      const fire = room.items.some(i => (i.t === 'fireplace' || i.t === 'eukachel') && i.on);
      if (meta.raining && fire && meta.music) discover('stormy');
      if (meta.raining && fire && meta.phase === 'night') discover('snowedin');
      if (meta.phase === 'day' && !meta.raining) {
        const sun = view.windowSpots().filter(w => room.items.some(i => CAT[i.t].beam && i.on));
        if ([...view.pets.values()].some(P => P.state === 'nap' && sun.some(w => Math.hypot(w.x + 0.5 - P.x, w.z + 0.5 - P.z) < 3))) discover('siesta');
      }
      if ([...view.pets.values()].some(P => P.perch && !P.hop)) discover('perch');
    }
    saveT += dt;
    if (saveT > 3 && dirty) { save(); saveT = 0; }
    if (view.fp) catDoors(now);
    if (view.fp && held.size) {
      const f = (held.has('w') || held.has('ArrowUp') ? 1 : 0) - (held.has('s') || held.has('ArrowDown') ? 1 : 0);
      const sd = (held.has('d') ? 1 : 0) - (held.has('a') ? 1 : 0), turn = (held.has('ArrowLeft') ? 1 : 0) - (held.has('ArrowRight') ? 1 : 0);
      if (turn) view.fp.look += turn * dt * 2.2;
      view.catMove(f, sd, dt);
    }
    view.beat = meta.music ? Sound.beat() : -1;   // the groove: lights pulse and cats bop on the beat
    view.frame(dt, t);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => view.resize());
  updateHeader();
  setMode(state.mode, true);
  if (meta.music) { meta.music = false; updateHeader(); }   // browsers need a tap before music can play
  requestAnimationFrame(loop);
  window.__lr = { room, view, state, meta, Sound, setPhase, setMode, interact, changed, mischief, visit, roomCode, readCode, discover, dailyTask, get rooms() { return rooms; } };   // handy for poking at it from the console
}

(window.Store ? window.Store.ready : Promise.resolve()).then(startLofiRooms);
