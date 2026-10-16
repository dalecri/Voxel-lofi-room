// Private ambient widgets and outbound launchers. Room items identify surfaces, never carry widget data.
(function (root) {
  // OWNER CONFIG: Pomodoro Terrarium session URL (confirmed by the owner).
  const POMODORO_URL = 'https://heycristobal.com/pomodoro-terrarium/';
  // OWNER CONFIG: edit the posting plan and both profile links here, in one place.
  const TST_CONTENT = {
    account: '@twostorytails', cadence: 'twice weekly',
    pillars: ['Nature-documentary deadpan', 'Corporate-CEO satire'],
    nextPost: 'A very serious field report on a cat investigating a leaf.',
    links: [
      { label: 'Instagram', url: 'https://www.instagram.com/twostorytails' },
      { label: 'TikTok', url: 'https://www.tiktok.com/@twostorytails' },
    ],
  };
  // OWNER CONFIG: each row marks confirmed links or defaults still needing verification.
  // Add another row with the same furnitureId to get a destination picker.
  const PORTALS = [
    { furnitureId: 'terrarium', label: 'Voxel Worlds', url: 'https://heycristobal.com/voxel-worlds/' },
    { furnitureId: 'arcade', label: 'HTML games', url: 'https://heycristobal.com/my-collection/' }, // Owner: verify exact games index URL; collection page used until confirmed.
    { furnitureId: 'crt', label: 'TwoStoryTails on YouTube', url: 'https://www.youtube.com/@twostorytails' }, // Owner: verify channel URL.
    { furnitureId: 'libcase', label: 'Portfolio', url: 'https://heycristobal.com/' }, // Owner: verify portfolio URL when editing; confirmed as heycristobal.com.
    { furnitureId: 'gamingdesk', label: 'QR Code generator', url: 'https://heycristobal.com/QR-Code-generator/' }, // Owner: verify QR app URL when editing; confirmed with this capitalization.
  ];
  const KEY = 'lr.widgets', HOUR = 3600000;
  const RSS = 'https://www.cbc.ca/webfeed/rss/rss-topstories';
  const WORDS = [
    ['bonjour', 'hello', 'Bonjour, mon ami !'], ['le chat', 'cat', 'Le chat dort sur le lit.'],
    ['la maison', 'house', 'La maison est petite.'], ['le soleil', 'sun', 'Le soleil brille ce matin.'],
    ['la pluie', 'rain', 'La pluie tombe doucement.'], ['le livre', 'book', 'Je lis un livre.'],
    ['le jardin', 'garden', 'Le jardin est vert.'], ['la fleur', 'flower', 'Cette fleur est jolie.'],
    ['le pain', 'bread', 'Je mange du pain.'], ['le thé', 'tea', 'Le thé est chaud.'],
    ['la fenêtre', 'window', 'La fenêtre est ouverte.'], ['la lune', 'moon', 'La lune est belle ce soir.'],
    ['aimer', 'to like / love', 'Je veux aimer chaque saison.'], ['lire', 'to read', 'Je vais lire un peu.'],
    ['dormir', 'to sleep', 'Le chat aime dormir.'], ['écouter', 'to listen', 'Je veux écouter la pluie.'],
    ['regarder', 'to look / watch', 'Viens regarder les étoiles.'], ['marcher', 'to walk', 'Nous aimons marcher ici.'],
    ['boire', 'to drink', 'Je vais boire de l’eau.'], ['manger', 'to eat', 'Nous allons manger ensemble.'],
    ['sourire', 'to smile', 'Cette musique me fait sourire.'], ['jouer', 'to play', 'Le chat veut jouer.'],
    ['petit', 'small', 'Ce petit chat est calme.'], ['doux', 'soft / gentle', 'Ce coussin est doux.'],
    ['chaud', 'warm / hot', 'Le café est chaud.'], ['calme', 'calm', 'La pièce est calme.'],
    ['joli', 'pretty', 'Ce jardin est joli.'], ['vert', 'green', 'Le tapis est vert.'],
    ['heureux', 'happy', 'Je suis heureux ici.'], ['tranquille', 'peaceful / quiet', 'La soirée est tranquille.'],
  ];
  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function wordOfDay(d = new Date()) {
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    const [word, translation, example] = WORDS[((day % WORDS.length) + WORDS.length) % WORDS.length];
    return { date: dateKey(d), word, translation, example };
  }
  function articleURL(value) {
    try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch (e) { return ''; }
  }
  function headlines(rows) {
    return (Array.isArray(rows) ? rows : []).filter(r => r && typeof r.title === 'string' && articleURL(r.url))
      .slice(0, 10).map(r => ({ title: r.title.slice(0, 400), url: articleURL(r.url), source: 'CBC News' }));
  }
  function parseRSS(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid feed');
    const rows = headlines(Array.from(doc.querySelectorAll('item')).map(item => ({ title: item.querySelector('title')?.textContent.trim(), url: item.querySelector('link')?.textContent.trim() })));
    if (!rows.length) throw new Error('Empty feed');
    return rows;
  }
  const WIDGETS = {
    'fridge-note': { id: 'fridge-note', furnitureId: 'minifridge', dataSource: 'local:french-words', refreshCadence: 'local-midnight', surface: 'fridge', render: data => ({ ...data, title: 'Un mot par jour', paper: '#f6e4a2', lines: [data.word || '', data.translation || '', data.example || ''] }) },
    newspaper: { id: 'newspaper', furnitureId: 'newspaper', dataSource: RSS, refreshCadence: HOUR, surface: 'paper',
      render: (data, now) => {
        const rows = headlines(data.headlines), cached = !!data.fetchedAt && (data.failed || now - data.fetchedAt >= HOUR);
        return { headlines: rows, cached, fetchedAt: data.fetchedAt || 0, title: 'CBC NEWS', paper: '#eee6d7', lines: [rows[0]?.title || 'A quiet moment for the news.', cached ? 'cached' : 'Top stories', 'Tap to read'] };
      } },
    'tst-corkboard': { id: 'tst-corkboard', furnitureId: 'tstcorkboard', dataSource: 'local:tst-content', refreshCadence: 'static', surface: 'board',
      render: data => ({ ...data, title: data.account || TST_CONTENT.account, paper: '#f2ddb1', lines: [data.cadence || TST_CONTENT.cadence, ...(data.pillars || TST_CONTENT.pillars), data.nextPost || TST_CONTENT.nextPost] }) },
    'pomodoro-candle': { id: 'pomodoro-candle', furnitureId: 'pomodorocandle', dataSource: 'local:pomodoro-url', refreshCadence: 'static', surface: 'flame',
      render: data => ({ label: 'Pomodoro Terrarium', url: articleURL(data.url || POMODORO_URL) }) },
    'app-portals': { id: 'app-portals', get furnitureId() { return [...new Set(PORTALS.map(p => p.furnitureId))]; }, dataSource: 'local:portals', refreshCadence: 'static', surface: 'portal',
      render: data => ({ portals: (data.portals || PORTALS).map(p => ({ ...p, url: articleURL(p.url) })).filter(p => p.url) }) },

  };
  const matches = (def, type) => (Array.isArray(def.furnitureId) ? def.furnitureId : [def.furnitureId]).includes(type);
  const attached = type => Object.values(WIDGETS).find(def => matches(def, type));
  function create({ store, now = () => new Date(), fetchRSS = url => fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(12000) }), parse = parseRSS }) {
    const saved = store.get(KEY, {}), state = {};
    let pending = null;
    if (saved && saved.newspaper) {
      const s = saved.newspaper;
      state.newspaper = { headlines: headlines(s.headlines), fetchedAt: Number(s.fetchedAt) || 0, attemptedAt: Number(s.attemptedAt) || 0, failed: !!s.failed };
    }
    const save = () => store.set(KEY, state);
    async function refresh(types) {
      const d = now(), time = d.getTime();
      if (types.includes('minifridge') && state['fridge-note']?.date !== dateKey(d)) { state['fridge-note'] = wordOfDay(d); save(); }
      const configs = { 'tst-corkboard': TST_CONTENT, 'pomodoro-candle': { url: POMODORO_URL }, 'app-portals': { portals: PORTALS } };
      for (const [id, config] of Object.entries(configs)) if (types.some(t => matches(WIDGETS[id], t)) && JSON.stringify(state[id]) !== JSON.stringify(config)) {
        state[id] = JSON.parse(JSON.stringify(config)); save();
      }
      if (!types.includes('newspaper')) return;
      const news = state.newspaper || (state.newspaper = { headlines: [], fetchedAt: 0, attemptedAt: 0, failed: false });
      if (pending || (news.attemptedAt && time - news.attemptedAt < HOUR)) return pending;
      news.attemptedAt = time; save();
      pending = Promise.resolve().then(async () => {
        try {
          const response = await fetchRSS(RSS);
          if (!response.ok) throw new Error('Feed unavailable');
          const rows = headlines(parse(await response.text()));
          if (!rows.length) throw new Error('Empty feed');
          news.headlines = rows; news.fetchedAt = now().getTime(); news.failed = false;
        } catch (e) { news.failed = true; }
        finally { save(); pending = null; }
      });
      return pending;
    }
    function data(id) { return WIDGETS[id].render(state[id] || {}, now().getTime()); }
    function destinations(type) {
      const def = attached(type); if (!def) return [];
      const value = data(def.id);
      const rows = def.id === 'tst-corkboard' ? (value.links || TST_CONTENT.links) : def.id === 'pomodoro-candle' ? [value] : def.id === 'app-portals' ? value.portals.filter(p => p.furnitureId === type) : [];
      return rows.map(p => ({ label: p.label, url: articleURL(p.url) })).filter(p => p.url);
    }
    return { refresh, data, destinations, get state() { return state; } };
  }
  // The existing LR0/LR1 JSON schema, projected onto decor fields only.
  // No storage reads and no arbitrary item properties cross this boundary.
  function shareDecor(room) {
    const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined && ['string', 'number', 'boolean'].includes(typeof o[k])).map(k => [k, o[k]]));
    const d = pick(room, ['v', 'name', 'n', 'view', 'next']);
    d.wall = pick(room.wall || {}, ['style', 'color']); d.floor = pick(room.floor || {}, ['style', 'color']);
    d.items = room.items.filter(i => i.t !== 'guestnote' && !i.visitor).map(i => pick(i, ['id', 't', 'c', 'r', 'on', 'x', 'z', 'p', 'lx', 'lz', 'k', 'u', 'e', 'seed', 'name', 'ch', 'link', 'crown', 'blanket', 'tipped']));
    return d;
  }
  function createView({ widgets, view, room, editing, hidden }) {
    const entries = new Map(); let next = 0;
    function dispose(entry) { entry.mesh.removeFromParent(); entry.mesh.geometry.dispose(); if (entry.mesh.material.map) entry.mesh.material.map.dispose(); entry.mesh.material.dispose(); entry.badge.remove(); }
    function paint(entry, data) {
      const c = entry.canvas.getContext('2d');
      c.fillStyle = data.paper; c.fillRect(0, 0, 512, 640);
      c.fillStyle = '#493f39'; c.textAlign = 'center'; c.font = 'bold 32px Nunito, sans-serif';
      c.fillText(data.title, 256, 58);
      let y = 150;
      data.lines.forEach((line, index) => {
        c.font = `${index === 0 ? 'bold 42' : '32'}px Nunito, sans-serif`;
        let row = '';
        for (const word of line.split(' ')) { if (c.measureText(row + word).width > 440 && row) { c.fillText(row.trim(), 256, y); y += 46; row = ''; } row += word + ' '; }
        c.fillText(row.trim(), 256, y); y += 78;
      });
      entry.mesh.material.map.needsUpdate = true;
    }
    function frame() {
      const time = performance.now(), alive = new Set();
      if (time >= next) { widgets.refresh(room.items.map(i => i.t)); next = time + 1000; }
      for (const it of room.items) {
        const def = attached(it.t), obj = view.objs.get(it.id);
        if (!def || !obj) continue;
        alive.add(it.id); let entry = entries.get(it.id);
        if (entry && entry.obj !== obj) { dispose(entry); entries.delete(it.id); entry = null; }
        if (!entry) {
          const paper = ['fridge', 'paper', 'board'].includes(def.surface);
          let canvas = null, mesh;
          if (paper) {
            canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 640;
            const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
            const size = def.surface === 'fridge' ? [.60, .75] : def.surface === 'board' ? [1.4, 1.35] : [.78, .96];
            mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
            if (def.surface === 'fridge') { mesh.position.set(.41, .88, .19); obj.userData.parts.door.add(mesh); }
            else if (def.surface === 'board') { mesh.position.set(1, 1.05, .507); obj.userData.inner.add(mesh); }
            else { mesh.rotation.x = -Math.PI / 2; mesh.position.set(.5, .252, .5); obj.userData.inner.add(mesh); }
          } else {
            mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.075), new THREE.MeshBasicMaterial({ color: 0xb5ebd5, transparent: true, opacity: .55, depthWrite: false }));
            const C = LR.CAT[it.t]; mesh.position.set(C.size[0] / 2, (LR.topOf(it) || (def.surface === 'flame' ? 13 : 24)) / 8 + .14, C.size[1] / 2);
            obj.userData.inner.add(mesh);
          }
          mesh.name = `widget:${def.id}`;
          const badge = document.createElement('span'); badge.className = 'widget-private'; badge.textContent = 'private'; badge.setAttribute('aria-label', 'Private widget content, excluded from room codes'); document.body.appendChild(badge);
          entry = { obj, def, canvas, mesh, badge, key: '' }; entries.set(it.id, entry);
        }
        const data = widgets.data(def.id), key = JSON.stringify(data);
        if (key !== entry.key) { if (entry.canvas) paint(entry, data); entry.key = key; }
        if (!entry.canvas) { entry.mesh.rotation.y = time * .0005; entry.mesh.material.opacity = .38 + .12 * Math.sin(time * .0015 + it.id); }
        const flame = obj.userData.parts.portalflame;
        if (flame) {
          const feedback = Math.max(0, (entry.feedbackUntil || 0) - time) / 900;
          flame.scale.set(1 + feedback * .12, 1 + .035 * Math.sin(time * .003) + feedback * .24, 1 + feedback * .12);
          flame.rotation.z = Math.sin(time * .004) * (.025 + feedback * .06);
        }
        const quiet = hidden(); entry.mesh.visible = !quiet;
        const p = view.root.localToWorld(view.itemPoint(it.id, [LR.CAT[it.t].size[0] * 4, it.t === 'minifridge' ? 15 : def.surface === 'paper' ? 2 : def.surface === 'board' ? 17 : (LR.topOf(it) || 24) + 2, 4])).project(view.cam), rect = view.r.domElement.getBoundingClientRect();
        entry.badge.hidden = !editing() || quiet || p.z < -1 || p.z > 1;
        entry.badge.style.left = Math.max(32, Math.min(innerWidth - 32, rect.left + (p.x + 1) * rect.width / 2)) + 'px';
        entry.badge.style.top = Math.max(12, Math.min(innerHeight - 16, rect.top + (1 - p.y) * rect.height / 2)) + 'px';
      }
      for (const [id, entry] of entries) if (!alive.has(id)) { dispose(entry); entries.delete(id); }
    }
    return { frame, feedback(id) { const entry = entries.get(id); if (entry) { entry.feedbackUntil = performance.now() + 900; frame(); } } };
  }
  function register(L) {
    L.def('tstcorkboard', {
      name: 'TwoStoryTails corkboard', kind: 'wall', group: 'wall', size: [2, 2], tap: 'widget', vars: [[]],
      build(m) {
        m.box(0, 0, 0, 16, 16, 2, 0x8c6445).box(1, 1, 2, 15, 15, 3, 0xc79860);
        m.box(2, 3, 3, 14, 14, 4, 0xf2ddb1).set(3, 13, 4, 0xbe6556).set(12, 13, 4, 0x739b8b);
      },
    });
    L.def('pomodorocandle', {
      name: 'Pomodoro portal candle', kind: 'small', group: 'lights', size: [1, 1], tap: 'widget', on: true, anim: 'flame', vars: [[0xb7ccb2]],
      build(m, [wax]) {
        m.box(1, 0, 1, 7, 1, 7, 0xa7835b).box(2, 1, 2, 6, 9, 6, wax).box(3, 9, 3, 5, 10, 5, 0x493a32);
        m.part('portalflame', [4, 10, 4]).box(3, 10, 3, 5, 12, 5, 0xffbd72, true).set(4, 12, 4, 0xffebbe, true); m.main();
      },
    });
    for (const p of PORTALS) if (L.CAT[p.furnitureId] && !L.CAT[p.furnitureId].tap) L.CAT[p.furnitureId].tap = 'widget';
  }
  const api = { POMODORO_URL, TST_CONTENT, PORTALS, attached, register, WIDGETS, WORDS, RSS, HOUR, wordOfDay, articleURL, parseRSS, create, createView, shareDecor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LRWidgets = api; register(root.LR); }
})(typeof window !== 'undefined' ? window : globalThis);
