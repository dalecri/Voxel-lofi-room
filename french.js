// French corner: Wordnest cards, studied offline on a paper desk.
// The vocabulary file keeps a sync note above the JSON. This loader strips those lines.
(function (root) {
  const KEY = 'lr.french.progress';
  const LIMIT = 20;
  const GAP = 3;
  const text = value => typeof value === 'string' ? value.trim() : '';

  function day(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseVocabulary(source, warn = console.warn) {
    const body = String(source).replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => !/^\s*\/\//.test(line)).join('\n');
    let data;
    try { data = JSON.parse(body); }
    catch (e) { warn('French vocabulary could not be read.'); return { cards: [], categories: [] }; }
    const raw = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : null;
    if (!raw) { warn('French vocabulary has no cards.'); return { cards: [], categories: [] }; }
    const categories = [];
    const labels = new Map();
    for (const cat of Array.isArray(data?.categories) ? data.categories : []) {
      const id = text(cat?.id), label = text(cat?.label);
      if (!id || !label || labels.has(id)) continue;
      labels.set(id, label);
      categories.push({ id, label });
    }
    const cards = [], seen = new Set();
    for (const card of raw) {
      const id = text(card?.id), fr = text(card?.fr), en = text(card?.en);
      if (!id || !fr || !en) { warn('Skipping a French card that is missing id, fr, or en.'); continue; }
      if (seen.has(id)) { warn('Skipping a French card with a repeated id.'); continue; }
      seen.add(id);
      const deck = text(card.deck) || 'words';
      cards.push({
        id, deck, label: labels.get(deck) || deck, fr, en,
        type: text(card.type), ex: text(card.ex), exEn: text(card.exEn), ipa: text(card.ipa), say: text(card.say),
      });
    }
    return { cards, categories };
  }

  function deckRows(cards, categories = []) {
    const counts = new Map(), labels = new Map();
    for (const card of cards) {
      counts.set(card.deck, (counts.get(card.deck) || 0) + 1);
      if (!labels.has(card.deck)) labels.set(card.deck, card.label || card.deck);
    }
    for (const cat of categories) if (cat?.id && cat.label) labels.set(cat.id, cat.label);
    const rows = [], seen = new Set();
    for (const cat of categories) {
      if (!cat || !counts.has(cat.id) || seen.has(cat.id)) continue;
      seen.add(cat.id);
      rows.push({ id: cat.id, label: labels.get(cat.id), count: counts.get(cat.id) });
    }
    for (const card of cards) {
      if (seen.has(card.deck)) continue;
      seen.add(card.deck);
      rows.push({ id: card.deck, label: labels.get(card.deck), count: counts.get(card.deck) });
    }
    return rows;
  }

  function queueFrom(cards, selected, progress, limit = LIMIT) {
    const chosen = new Set(selected);
    const pool = cards.filter(card => chosen.has(card.deck));
    const rank = id => progress?.cards?.[id]?.status === 'learning' ? 0 : progress?.cards?.[id]?.status === 'known' ? 2 : 1;
    return pool.filter(card => rank(card.id) === 0).concat(pool.filter(card => rank(card.id) === 1), pool.filter(card => rank(card.id) === 2)).slice(0, limit);
  }

  function rotate(queue, action, gap = GAP) {
    if (!queue.length) return [];
    const next = queue.slice(1), card = queue[0];
    if (action === 'known') return next;
    if (action === 'skip') return next.concat(card);
    next.splice(Math.min(gap, next.length), 0, card);
    return next;
  }

  function face(card, flipped) {
    if (!card) return null;
    if (!flipped) return { side: 'front', word: card.fr, type: card.type || '' };
    return { side: 'back', word: card.en, example: card.ex || '', translation: card.exEn || '', say: card.say || '', ipa: card.ipa || '' };
  }

  function wordOfDay(cards, dateKey) {
    if (!cards.length || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
    let hash = 2166136261;
    for (let i = 0; i < dateKey.length; i++) hash = Math.imul(hash ^ dateKey.charCodeAt(i), 16777619);
    return cards[(hash >>> 0) % cards.length];
  }

  function create({ store, cards = [], now = () => new Date(), onStudied = () => {} } = {}) {
    let list = [], categories = [];
    setCards(cards);
    let session = null;

    function read() {
      const value = store.get(KEY, {});
      const raw = value && typeof value.cards === 'object' && value.cards && !Array.isArray(value.cards) ? value.cards : {};
      const saved = {};
      for (const [id, row] of Object.entries(raw)) {
        if (!id || !row || (row.status !== 'known' && row.status !== 'learning')) continue;
        saved[id] = { status: row.status, updatedAt: Number.isFinite(row.updatedAt) ? row.updatedAt : 0 };
      }
      return { v: 1, cards: saved, decks: Array.isArray(value?.decks) ? value.decks.filter(id => typeof id === 'string') : null };
    }
    function write(progress) {
      const saved = { v: 1, cards: progress.cards, decks: progress.decks };
      store.set(KEY, saved);
      if (JSON.stringify(store.get(KEY, null)) !== JSON.stringify(saved)) throw Error('Could not save French progress on this device.');
    }
    function setCards(input) {
      if (Array.isArray(input)) { list = input.slice(); categories = []; }
      else { list = (input?.cards || []).slice(); categories = (input?.categories || []).slice(); }
    }
    function decks() { return deckRows(list, categories); }
    function selection() {
      const names = decks().map(deck => deck.id);
      const saved = read().decks;
      if (saved == null) return names;
      return saved.filter(id => names.includes(id));
    }
    function setDecks(names) {
      const known = new Set(decks().map(deck => deck.id));
      const progress = read();
      progress.decks = (Array.isArray(names) ? names : []).filter(id => known.has(id));
      write(progress);
      return selection();
    }
    function blank() {
      return { mode: 'decks', card: null, flipped: false, graded: 0, planned: 0, progress: '', done: false, queue: [] };
    }
    function snapshot() {
      if (!session) return blank();
      const card = session.done ? null : session.queue[0] || null;
      return {
        mode: session.done ? 'done' : 'study', card, flipped: !!session.flipped && !session.done,
        graded: session.graded.size, planned: session.planned,
        progress: `${session.graded.size}/${session.planned}`, done: session.done,
        queue: session.queue.map(item => item.id),
      };
    }
    function logStudy() {
      if (!session || session.logged || !session.graded.size) return;
      session.logged = true;
      onStudied();
    }
    function finish() { session.done = true; session.flipped = false; session.queue = []; logStudy(); }
    function start(selected) {
      const picked = selected == null ? selection() : selected.filter(id => decks().some(deck => deck.id === id));
      const progress = read();
      progress.decks = picked.slice();
      write(progress);
      const queue = queueFrom(list, picked, progress);
      session = { queue, planned: queue.length, graded: new Set(), seen: 0, flipped: false, cap: Math.max(queue.length * 2, queue.length), done: queue.length === 0, logged: false };
      return snapshot();
    }
    function saveReview(id,status) {
      if (!list.some(card=>card.id===id) || !['known','learning'].includes(status)) return false;
      const progress=read();progress.cards[id]={status,updatedAt:+now()};write(progress);return true;
    }
    function review(id,status) { if(!saveReview(id,status))return false;onStudied();return true; }
    function nextWord(id,date) { if(!list.length)return null;const index=list.findIndex(card=>card.id===id);return list[(index<0?list.indexOf(word(date))+1:index+1)%list.length]; }
    function act(action) {
      if (!session || session.done) return snapshot();
      if (action === 'flip') { if (session.queue[0]) session.flipped = true; return snapshot(); }
      if (action !== 'known' && action !== 'learning' && action !== 'skip') return snapshot();
      if ((action === 'known' || action === 'learning') && !session.flipped) return snapshot();
      const card = session.queue[0];
      if (!card) { finish(); return snapshot(); }
      if (action === 'known' || action === 'learning') {
        saveReview(card.id,action);
        session.graded.add(card.id);
      }
      session.queue = rotate(session.queue, action);
      session.flipped = false;
      session.seen += 1;
      if (!session.queue.length || session.seen >= session.cap) finish();
      return snapshot();
    }
    function close() { logStudy(); }
    function word(date) {
      const key = typeof date === 'string' ? date : day(date || now());
      return wordOfDay(list, key);
    }
    return { setCards, cards: () => list.slice(), categories: () => categories.slice(), decks, selection, setDecks, start, act, close, view: snapshot, progress: read, word, nextWord, review, face };
  }

  function registerFurniture(LR) {
    if (!LR?.def || LR.CAT?.frenchdesk) return;
    const { def, grain, shade, WOOD } = LR;
    def('frenchdesk', {
      name: 'French corner', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: 12, tap: 'french',
      vars: [[WOOD.oak, 0xfff6e8], [WOOD.walnut, 0xfff6e8], [WOOD.honey, 0xf7e7c8]],
      build(m, [wood, paper]) {
        const top = grain(wood), edge = shade(wood, 0.82);
        m.box(0, 11, 0, 16, 12, 8, top);
        [[0, 0], [0, 7], [15, 0], [15, 7]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 11, z + 1, edge));
        m.box(1, 10, 1, 15, 11, 7, shade(wood, 0.9));
        m.box(2, 12, 1, 8, 13, 6, shade(paper, 0.9));
        m.box(2, 13, 2, 8, 14, 6, paper);
        m.box(3, 14, 2, 9, 15, 6, 0xfffaf2);
        m.box(4, 15, 3, 8, 16, 4, 0xc4896a);
        m.box(11, 12, 2, 15, 13, 3, 0x2c2a32);
        m.set(15, 12, 2, 0xc45a4a);
      },
    });
  }

  function createView({ model, portrait = () => '', onCorrect = () => {}, beforeOpen = () => {}, reduced = () => false } = {}) {
    const doc = root.document;
    const el = (tag, cls, text) => { const node = doc.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
    const overlay = el('section');
    overlay.id = 'frenchView';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'French corner');
    const chrome = el('header', 'french-chrome');
    const title = el('h2', '', 'French corner');
    const progress = el('p', 'french-progress');
    progress.setAttribute('role', 'status');
    progress.setAttribute('aria-live', 'polite');
    const closeBtn = el('button', 'french-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close French corner');
    chrome.append(title, progress, closeBtn);
    const body = el('div', 'french-body');
    const decks = el('section', 'french-decks');
    const deckIntro = el('p', 'french-lead', 'Every deck is checked. Leave out any you want to save for later.');
    const deckList = el('div', 'french-deck-list');
    const deckNote = el('p', 'french-note', 'Choose at least one deck.');
    deckNote.hidden = true;
    const startBtn = el('button', 'french-btn french-start', 'Start studying');
    startBtn.type = 'button';
    decks.append(deckIntro, deckList, deckNote, startBtn);
    const study = el('section', 'french-study');
    const palWrap = el('div', 'french-pal-wrap');
    const pal = el('img', 'french-pal');
    pal.alt = '';
    pal.width = 72;
    pal.height = 72;
    palWrap.setAttribute('aria-hidden', 'true');
    palWrap.appendChild(pal);
    const stage = el('div', 'french-stage');
    const cardBtn = el('button', 'french-card');
    cardBtn.type = 'button';
    const flip = el('span', 'french-flip');
    const front = el('span', 'french-face french-front');
    const frontType = el('p', 'french-type');
    const frontWord = el('h3', 'french-word');
    const frontHint = el('p', 'french-hint', 'Tap the card');
    front.append(frontType, frontWord, frontHint);
    const back = el('span', 'french-face french-back');
    const backWord = el('h3', 'french-meaning');
    const backExample = el('p', 'french-example');
    const backTranslation = el('p', 'french-translation');
    const backSay = el('p', 'french-say');
    const backIpa = el('p', 'french-ipa');
    back.append(backWord, backExample, backTranslation, backSay, backIpa);
    flip.append(front, back);
    cardBtn.appendChild(flip);
    stage.appendChild(cardBtn);
    const actions = el('div', 'french-actions');
    const skipBtn = el('button', 'french-btn french-skip', 'Skip');
    const learnBtn = el('button', 'french-btn french-learn', 'Still learning');
    const knewBtn = el('button', 'french-btn french-knew', 'Knew it');
    [skipBtn, learnBtn, knewBtn].forEach(btn => { btn.type = 'button'; actions.appendChild(btn); });
    study.append(palWrap, stage, actions);
    const done = el('section', 'french-done');
    const donePalWrap = el('div', 'french-pal-wrap');
    const donePal = el('img', 'french-pal');
    donePal.alt = '';
    donePal.width = 84;
    donePal.height = 84;
    donePalWrap.setAttribute('aria-hidden', 'true');
    donePalWrap.appendChild(donePal);
    const doneTitle = el('h3', 'french-done-title', "That's enough for now.");
    const doneCopy = el('p', 'french-done-copy');
    const againBtn = el('button', 'french-btn french-again', 'Another round');
    againBtn.type = 'button';
    done.append(donePalWrap, doneTitle, doneCopy, againBtn);
    body.append(decks, study, done);
    overlay.append(chrome, body);
    doc.body.appendChild(overlay);
    let active = false, lastFocus = null, todayHost = null, todayCardId = null, todayDate = "";

    function viewport() {
      overlay.style.height = (root.visualViewport?.height || root.innerHeight) + 'px';
      overlay.style.top = (root.visualViewport?.offsetTop || 0) + 'px';
    }
    function showPal(img, reaction) {
      let src = '';
      try { src = portrait(reaction) || ''; } catch (e) { src = ''; }
      img.hidden = !src;
      if (src && img.src !== src) img.src = src;
      img.classList.remove('french-bounce');
      if (reaction === 'happy' && src) { void img.offsetWidth; img.classList.add('french-bounce'); }
    }
    function paintToday() {
      const btn = todayHost?.querySelector('.french-today') || doc.querySelector('.space-today .french-today');
      if (!btn) return;
      const date=day(new Date());if(todayDate!==date){todayDate=date;todayCardId=null;}
      const card=model.cards().find(card=>card.id===todayCardId) || model.word();
      btn.hidden = !card;const shell=btn.closest('.french-today-card');if(shell)shell.hidden=!card;
      if (!card) return;
      todayCardId=card.id;btn.dataset.cardId=card.id;
      const status=model.progress().cards[card.id]?.status;
      if(shell){shell.querySelector('.french-review-known').setAttribute('aria-pressed',String(status==='known'));shell.querySelector('.french-review-learning').setAttribute('aria-pressed',String(status==='learning'));shell.querySelector('.french-review-status').textContent=status==='known'?'Learned':status==='learning'?'Still learning':'';btn.querySelector('.french-today-kicker').textContent=card.id===model.word()?.id?"Today's French word":'Another French word';}
      btn.querySelector('b').textContent = card.fr;
      btn.querySelector('small').textContent = card.en;
      if(btn.dataset.flip){btn.querySelector('.french-example').textContent=card.ex || card.en;btn.querySelector('.french-example-translation').textContent=card.exEn || '';btn.setAttribute('aria-pressed',String(btn.classList.contains('is-flipped')));}
      btn.setAttribute('aria-label', btn.dataset.flip&&btn.classList.contains('is-flipped')?`${card.ex || card.en}${card.exEn?' · '+card.exEn:''}. Tap to return.`:`French word of the day: ${card.fr}, ${card.en}`+(btn.dataset.flip?'. Tap to flip.':''));
    }
    function checkedDecks() {
      return [...deckList.querySelectorAll('input')].filter(input => input.checked).map(input => input.value);
    }
    function paintDecks() {
      const rows = model.decks(), selected = new Set(model.selection());
      deckList.replaceChildren();
      deckIntro.textContent = rows.length ? 'Every deck starts checked. Leave out any you want to save for later.' : 'The words are settling onto the desk.';
      for (const deck of rows) {
        const label = el('label', 'french-deck');
        const input = el('input');
        input.type = 'checkbox';
        input.value = deck.id;
        input.checked = selected.has(deck.id);
        input.setAttribute('aria-label', `${deck.label}, ${deck.count} cards`);
        const name = el('span', 'french-deck-name', deck.label);
        const count = el('small', '', `${deck.count}`);
        label.append(input, name, count);
        input.onchange = () => { try { model.setDecks(checkedDecks()); } catch (e) { progress.textContent = e.message; } syncStart(); };
        deckList.appendChild(label);
      }
      syncStart();
    }
    function syncStart() {
      const count = checkedDecks().length;
      startBtn.disabled = count === 0;
      deckNote.hidden = count > 0 || !model.decks().length;
    }
    function paintCard(state) {
      const shown = face(state.card, state.flipped);
      flip.classList.toggle('is-back', !!state.flipped);
      frontType.hidden = !state.card?.type;
      frontType.textContent = state.card?.type || '';
      frontWord.textContent = state.card?.fr || '';
      backWord.textContent = shown?.word || '';
      backExample.hidden = !shown?.example;
      backExample.textContent = shown?.example || '';
      backTranslation.hidden = !shown?.translation;
      backTranslation.textContent = shown?.translation || '';
      backSay.hidden = !shown?.say;
      backSay.textContent = shown?.say || '';
      backIpa.hidden = !shown?.ipa;
      backIpa.textContent = shown?.ipa || '';
      cardBtn.setAttribute('aria-label', state.flipped ? `${state.card.fr}, showing English` : `Flip ${state.card?.fr || 'card'}`);
      learnBtn.hidden = knewBtn.hidden = !state.flipped;
    }
    function paint(reaction) {
      overlay.classList.toggle('is-reduced', !!reduced() || root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      const state = model.view();
      decks.hidden = state.mode !== 'decks';
      study.hidden = state.mode !== 'study';
      done.hidden = state.mode !== 'done';
      if (state.mode === 'decks') {
        progress.textContent = model.cards().length ? `${model.cards().length} cards` : '';
        paintDecks();
      } else if (state.mode === 'study') {
        progress.textContent = state.progress;
        paintCard(state);
        showPal(pal, reaction || (state.flipped ? 'watching' : 'calm'));
      } else {
        progress.textContent = state.planned ? state.progress : '';
        doneCopy.textContent = state.graded ? `You sat with ${state.graded} card${state.graded === 1 ? '' : 's'}. They'll be here when you want them.` : 'You can pause here. The cards will wait.';
        showPal(donePal, 'happy');
      }
      paintToday();
    }
    function grade(action) {
      const before = model.view();
      let state;
      try { state = model.act(action); }
      catch (e) { progress.textContent = e.message; return; }
      if (action === 'known' && before.flipped) { try { onCorrect(); } catch (e) { /* the card still moves on */ } paint('happy'); }
      else paint();
      if (state.mode === 'study' && action !== 'flip') cardBtn.focus();
    }
    function open() {
      if (!active) {
        lastFocus = doc.activeElement;
        beforeOpen();
        active = true;
        overlay.hidden = false;
        viewport();
      }
      paint();
      closeBtn.focus();
    }
    function close() {
      if (!active) return;
      try { model.close(); } catch (e) { /* closing still wins */ }
      active = false;
      overlay.hidden = true;
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    function mountToday(host,{flip=false}={}) {
      if (!host) return;
      todayHost = host;
      let btn = host.querySelector('.french-today');
      if (!btn) {
        btn = el('button', 'french-today');
        btn.type = 'button';
        btn.append(el('span', 'french-today-kicker', "Today's French word"), el('b', ''), el('small', ''));
        if(flip){btn.dataset.flip='true';const front=el('span','french-front'),back=el('span','french-back');front.append(...btn.childNodes,el('span','french-flip-hint','tap to flip'));back.append(el('span','french-today-kicker','In a sentence'),el('span','french-example'),el('span','french-example-translation'),el('span','french-flip-hint','tap to return'));back.hidden=true;btn.append(front,back);btn.onclick=()=>{const on=btn.classList.toggle('is-flipped');front.hidden=on;back.hidden=!on;btn.setAttribute('aria-pressed',String(on));paintToday();};}
        else btn.onclick = () => open();
        const sky = host.querySelector('.today-sky');
        if (sky) sky.insertAdjacentElement('afterend', btn);
        else if(flip)host.appendChild(btn);
        else host.prepend(btn);
        if(flip){
          const card=el('section','french-today-card');card.setAttribute('aria-label','French quick review');btn.replaceWith(card);card.appendChild(btn);
          const actions=el('div','french-quick-actions'),status=el('span','french-review-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
          for(const [action,label,path] of [['learning','Still learning','m6 6 12 12M18 6 6 18'],['known','Mark as learned','m5 12 4 4L19 6']]){
            const control=el('button','french-review-'+action);control.type='button';control.setAttribute('aria-label',label);control.title=label;control.setAttribute('aria-pressed','false');control.innerHTML=`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
            control.onclick=()=>{try{if(model.review(todayCardId,action)){paintToday();if(action==='known')try{onCorrect();}catch(e){/* optional celebration */}}}catch(e){status.textContent=e.message;}};actions.appendChild(control);
          }
          const next=el('button','french-next-word','Next word →');next.type='button';next.onclick=()=>{const word=model.nextWord(todayCardId);if(!word)return;todayCardId=word.id;btn.classList.remove('is-flipped');btn.querySelector('.french-front').hidden=false;btn.querySelector('.french-back').hidden=true;paintToday();};
          card.append(actions,status,next);
        }
      }
      paintToday();
    }
    closeBtn.onclick = event => { event.stopPropagation(); close(); };
    startBtn.onclick = () => { if (startBtn.disabled) return; try { model.start(checkedDecks()); } catch (e) { progress.textContent = e.message; return; } paint(); cardBtn.focus(); };
    cardBtn.onclick = () => { if (!model.view().flipped) grade('flip'); };
    skipBtn.onclick = () => grade('skip');
    learnBtn.onclick = () => grade('learning');
    knewBtn.onclick = () => grade('known');
    againBtn.onclick = () => { try { model.start(); } catch (e) { progress.textContent = e.message; return; } paint(); cardBtn.focus(); };
    root.addEventListener('keydown', event => {
      if (!active || event.key !== 'Escape') return;
      event.preventDefault();
      close();
      event.stopImmediatePropagation();
    }, true);
    root.addEventListener('resize', () => { if (active) viewport(); });
    root.visualViewport?.addEventListener('resize', () => { if (active) viewport(); });
    root.visualViewport?.addEventListener('scroll', () => { if (active) viewport(); });
    return { open, close, mountToday, refresh: paint, overlay, get active() { return active; }, get model() { return model; } };
  }

  async function load(url = 'assets/french.json', fetcher = (...args) => root.fetch(...args)) {
    const response = await fetcher(url);
    if (!response.ok) throw Error('French words could not be opened.');
    return parseVocabulary(await response.text());
  }

  const LR = typeof module !== 'undefined' && module.exports ? require('./room.js') : root.LR;
  if (LR) registerFurniture(LR);
  const api = { KEY, LIMIT, GAP, day, parseVocabulary, deckRows, queueFrom, rotate, face, wordOfDay, create, createView, registerFurniture, load };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRFrench = api;
})(typeof window !== 'undefined' ? window : globalThis);
