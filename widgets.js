// Private read-only widgets. Room items identify surfaces, never carry widget data.
(function (root) {
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
    'fridge-note': { id: 'fridge-note', furnitureId: 'minifridge', dataSource: 'local:french-words', refreshCadence: 'local-midnight', render: data => ({ ...data, title: 'Un mot par jour', paper: '#f6e4a2', lines: [data.word || '', data.translation || '', data.example || ''] }) },
    newspaper: { id: 'newspaper', furnitureId: 'newspaper', dataSource: RSS, refreshCadence: HOUR,
      render: (data, now) => {
        const rows = headlines(data.headlines), cached = !!data.fetchedAt && (data.failed || now - data.fetchedAt >= HOUR);
        return { headlines: rows, cached, fetchedAt: data.fetchedAt || 0, title: 'CBC NEWS', paper: '#eee6d7', lines: [rows[0]?.title || 'A quiet moment for the news.', cached ? 'cached' : 'Top stories', 'Tap to read'] };
      } },
  };
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
    return { refresh, data, get state() { return state; } };
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
  function createView({ widgets, view, room, editing, hidden, open }) {
    const entries = new Map(); let next = 0;
    function dispose(entry) { entry.mesh.removeFromParent(); entry.mesh.geometry.dispose(); entry.mesh.material.map.dispose(); entry.mesh.material.dispose(); entry.badge.remove(); }
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
        const def = Object.values(WIDGETS).find(w => w.furnitureId === it.t), obj = view.objs.get(it.id);
        if (!def || !obj) continue;
        alive.add(it.id); let entry = entries.get(it.id);
        if (entry && entry.obj !== obj) { dispose(entry); entries.delete(it.id); entry = null; }
        if (!entry) {
          const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 640;
          const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.id === 'fridge-note' ? .60 : .78, def.id === 'fridge-note' ? .75 : .96), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
          mesh.name = `widget:${def.id}`;
          if (def.id === 'fridge-note') { mesh.position.set(.41, .88, .19); obj.userData.parts.door.add(mesh); }
          else { mesh.rotation.x = -Math.PI / 2; mesh.position.set(.5, .252, .5); obj.userData.inner.add(mesh); }
          const badge = document.createElement('span'); badge.className = 'widget-private'; badge.textContent = 'private'; badge.setAttribute('aria-label', 'Private widget content, excluded from room codes'); document.body.appendChild(badge);
          entry = { obj, def, canvas, mesh, badge, key: '' }; entries.set(it.id, entry);
        }
        const data = widgets.data(def.id), key = JSON.stringify(data);
        if (key !== entry.key) { paint(entry, data); entry.key = key; }
        const quiet = hidden(); entry.mesh.visible = !quiet;
        const p = view.root.localToWorld(view.itemPoint(it.id, [4, it.t === 'minifridge' ? 15 : 2, 4])).project(view.cam), rect = view.r.domElement.getBoundingClientRect();
        entry.badge.hidden = !editing() || quiet || p.z < -1 || p.z > 1;
        entry.badge.style.left = Math.max(32, Math.min(innerWidth - 32, rect.left + (p.x + 1) * rect.width / 2)) + 'px';
        entry.badge.style.top = Math.max(12, Math.min(innerHeight - 16, rect.top + (1 - p.y) * rect.height / 2)) + 'px';
      }
      for (const [id, entry] of entries) if (!alive.has(id)) { dispose(entry); entries.delete(id); }
    }
    return { frame, open() { open(widgets.data('newspaper')); } };
  }
  const api = { WIDGETS, WORDS, RSS, HOUR, wordOfDay, articleURL, parseRSS, create, createView, shareDecor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRWidgets = api;
})(typeof window !== 'undefined' ? window : globalThis);
