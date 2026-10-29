// The Lane: your house on a little street with a few permanent places, each with a job.
// Everything recurring is systemic (rotations, seeded days, templated letters), so nothing
// needs writing by hand. Nothing expires and nothing breaks if you're away: shelf items
// cycle back, papers wait quietly, and the "while you were away" note stays gentle.
// State lives under lr.lane and never enters rooms or share codes.
(function (root) {
  'use strict';
  const KEY = 'lr.lane';
  const PLACES = [
    ['house', 'Your house', 'Rooms, the house map and your guest book'],
    ['shop', 'The Shop', 'Mallow’s shelf, three finds a day'],
    ['mail', 'Mail Room', 'Papers, the Sunday magazine and letters'],
    ['notice', 'Notice Board', 'What’s on this week'],
  ];
  const DAY = 86400000;
  const valid = d => typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d);
  // Whole days between two local date keys, counted at noon so clock changes never wobble it.
  const dayNumber = d => Math.round(new Date(d + 'T12:00').getTime() / DAY);
  const daysBetween = (a, b) => dayNumber(b) - dayNumber(a);
  const weekday = d => new Date(d + 'T12:00').getDay();
  // A fixed, seeded order: the shelf walks through it, so every item comes back on a cycle.
  function seededOrder(list, seed) {
    let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) | 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 100000) / 100000; };
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  // Today's shelf: three regular finds, plus a special on Sundays (a traveling colourway).
  // Only unowned items are stocked; anything you skip returns within a few days.
  function shelf({ catalog, owns = () => false, date }) {
    if (!valid(date)) return { items: [], special: null };
    const unowned = catalog.filter(i => !owns(i.id));
    const regular = seededOrder(unowned.filter(i => !i.exclusive).map(i => i.id).sort(), 'lane-shelf');
    const n = regular.length, start = n ? (dayNumber(date) * 3) % n : 0;
    const items = [];
    for (let k = 0; k < Math.min(3, n); k++) items.push(regular[(start + k) % n]);
    let special = null;
    if (weekday(date) === 0) {
      const rare = seededOrder(unowned.filter(i => i.exclusive).map(i => i.id).sort(), 'lane-special');
      special = rare.length ? rare[Math.floor(dayNumber(date) / 7) % rare.length] : null;
    }
    return { items, special };
  }
  // How long until a skipped item is back on the shelf (in days).
  const cycleDays = ({ catalog, owns = () => false }) => Math.max(1, Math.ceil(catalog.filter(i => !owns(i.id) && !i.exclusive).length / 3));
  // A capped, kind note when you come back after two days or more. Never a pile to clear.
  function away({ lastVisit, today, unreadPapers = 0 }) {
    if (!valid(lastVisit) || !valid(today)) return null;
    const days = daysBetween(lastVisit, today);
    if (days < 2) return null;
    const when = days > 14 ? 'a little while' : `${days} days`;
    const papers = unreadPapers > 0 ? (unreadPapers === 1 ? ' One paper is waiting in the Mail Room.' : unreadPapers > 6 ? ' A few papers are waiting in the Mail Room, no rush.' : ` ${unreadPapers} papers are waiting in the Mail Room.`) : '';
    return `Welcome back! You were away ${when}. Mallow restocked his shelf while you were gone.${papers}`;
  }
  // Templated letters from the lane. Each has a stable id, so read marks stick.
  function letters({ firstVisit, today, specialName = null }) {
    if (!valid(firstVisit) || !valid(today)) return [];
    const out = [{ id: 'welcome', date: firstVisit, from: 'Mallow', subject: 'Welcome to the lane',
      body: 'Hello, neighbour! I keep the little shop two doors down. Three new finds on the shelf every day, and something rare on Sundays. Nothing ever goes for good: if you miss a thing, it comes back around.\n\nFireflies come from the cozy things you already do. Pop by whenever you like.\n\nMallow' }];
    // The most recent Sunday since you arrived brings a short note about the special.
    const back = weekday(today), sunday = new Date(new Date(today + 'T12:00').getTime() - back * DAY);
    const sundayKey = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
    if (sundayKey >= firstVisit && sundayKey !== firstVisit) out.push({ id: 'sunday-' + sundayKey, date: sundayKey, from: 'Mallow', subject: 'This Sunday on the lane',
      body: (specialName ? `Sunday’s special came in: the ${specialName}. It’s only on the shelf today, but it comes back on another Sunday if today isn’t the day.` : 'No special this Sunday: you’ve collected every rare find I carry. Tea’s on me.') + '\n\nThe week ahead is pinned on the Notice Board.\n\nMallow' });
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }
  // The Notice Board: tomorrow, then the rest of the week. Days with nothing on are skipped.
  function notices({ today, events = [], holidays = [], seasonal = () => [] }) {
    if (!valid(today)) return [];
    const rows = [];
    for (let k = 0; k < 7; k++) {
      const d = new Date(new Date(today + 'T12:00').getTime() + k * DAY);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const items = [...events.filter(e => e.date === key).map(e => ({ kind: BIRTHDAY.test(e.title || '') ? 'birthday' : 'event', title: (BIRTHDAY.test(e.title || '') ? '🎂 ' : '') + e.title })),
        ...holidays.filter(h => h.date === key).map(h => ({ kind: 'holiday', title: h.name || h.title || 'Holiday' })),
        ...seasonal(key).map(s => ({ kind: 'season', title: typeof s === 'string' ? s : s.label || s.title || '' }))].filter(i => i.title);
      if (items.length) rows.push({ date: key, label: k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' }), items });
    }
    return rows;
  }
  // Days to the next solstice or equinox: true everywhere on Earth, so no hemisphere guess.
  function skyNote(today) {
    if (!valid(today)) return '';
    const y = +today.slice(0, 4), marks = [[2, 20, 'the March equinox'], [5, 21, 'the June solstice'], [8, 22, 'the September equinox'], [11, 21, 'the December solstice']];
    for (const yy of [y, y + 1]) for (const [m, d, name] of marks) {
      const key = `${yy}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, n = daysBetween(today, key);
      if (n >= 0) return n === 0 ? `Today is ${name}.` : `${n} day${n === 1 ? '' : 's'} until ${name}.`;
    }
    return '';
  }
  function create({ store, today }) {
    const read = () => { const s = store.get(KEY, {}) || {}; return { firstVisit: valid(s.firstVisit) ? s.firstVisit : '', lastVisit: valid(s.lastVisit) ? s.lastVisit : '', read: Array.isArray(s.read) ? s.read.filter(x => typeof x === 'string').slice(-200) : [] }; };
    const save = s => store.set(KEY, s);
    return {
      // Called when the lane is shown: returns the away note (once) and records the visit.
      visit(unreadPapers = 0) {
        const s = read(), t = today(), note = away({ lastVisit: s.lastVisit, today: t, unreadPapers });
        if (!s.firstVisit) s.firstVisit = t;
        if (s.lastVisit !== t) { s.lastVisit = t; save(s); }
        return note;
      },
      get firstVisit() { return read().firstVisit || today(); },
      isRead: id => read().read.includes(id),
      markRead(id) { const s = read(); if (!s.read.includes(id)) { s.read.push(id); save(s); } },
    };
  }


  // ---------- Phase 2: residents, seasons and dressing (all systemic) ----------
  // Residents are the save's own pets. Each gets one place a day, seeded by the date and
  // the pet, and a templated thing to be doing there. Everyone is home at night.
  const DOING = {
    house: ['curled up by the window', 'napping on the rug', 'playing in the hall', 'watching the street from the sill'],
    shop: ['helping Mallow stock the shelf', 'asleep on the shop counter', 'guarding the till', 'inspecting a new delivery'],
    mail: ['sorting the post', 'asleep in the parcel bin', 'watching the mail slot', 'sitting on the Sunday magazines'],
    notice: ['reading the notice board', 'batting at a pinned note', 'sunning by the board', 'keeping an eye on the week'],
  };
  function seeded(text) { let s = 2166136261; for (const ch of text) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619); } return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); return ((s ^= s >>> 16) >>> 0) / 4294967296; }; }
  function residents({ pets = [], date, phase = 'day' }) {
    if (!valid(date)) return [];
    return pets.slice(0, 12).map(pet => {
      const rnd = seeded(date + '|' + pet.key), places = ['house', 'shop', 'mail', 'notice'];
      let place = places[Math.floor(rnd() * places.length)];
      const homeEarly = rnd() < 0.5;
      if (phase === 'night' || (phase === 'evening' && homeEarly)) place = 'house';
      const doing = phase === 'night' ? 'asleep at home' : DOING[place][Math.floor(rnd() * DOING[place].length)];
      return { key: pet.key, name: pet.name, coat: pet.coat, place, doing };
    });
  }
  const at = (list, place) => list.filter(r => r.place === place);
  // "Neo is sorting the post." / "Neo and Biscuit are asleep at home." Pets doing the same thing share a line.
  const andList = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names.at(-1);
  function sayAround(list) {
    const groups = new Map();
    for (const r of list) { if (!groups.has(r.doing)) groups.set(r.doing, []); groups.get(r.doing).push(r.name); }
    return [...groups].map(([doing, names]) => `${andList(names)} ${names.length === 1 ? 'is' : 'are'} ${doing}.`).join(' ');
  }
  // The Daily Brief's lane column: this morning's routines, plus what's on Mallow's shelf.
  const WHERE = { house: 'at home', shop: 'at the shop', mail: 'at the Mail Room', notice: 'by the notice board' };
  function briefColumn({ residents: list = [], special = null }) {
    if (!list.length && !special) return null;
    const shop = special ? `Mallow has three new finds on the shelf, and it's Sunday: the ${special} is in.` : 'Mallow has three new finds on the shelf.';
    return { body: shop, items: list.slice(0, 6).map(r => ({ label: r.name, value: `${r.doing[0].toUpperCase()}${r.doing.slice(1)}${r.place === 'house' ? '' : ' (' + WHERE[r.place] + ')'}` })) };
  }
  // Hemisphere: from the live-weather latitude when there is one, else the time zone.
  const SOUTH = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate|Port_Moresby)|^America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|La_Paz|Lima|Punta_Arenas)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Lusaka|Maseru|Mbabane|Lubumbashi)|^Indian\/(Mauritius|Reunion|Antananarivo)/;
  function hemisphere({ latitude = null, timeZone = '' } = {}) {
    if (Number.isFinite(latitude)) return latitude < 0 ? 'south' : 'north';
    return SOUTH.test(String(timeZone)) ? 'south' : 'north';
  }
  // One templated note a month, shifted six months for the southern hemisphere.
  const MONTH_NOTES = ['Deep winter: the lamps stay on a little longer.', 'Late winter: the days are stretching out again.', 'Early spring: the lane smells like wet soil.',
    'Spring: windows open, the first warm afternoons.', 'Late spring: everything is green and a bit too tall.', 'Early summer: long light, late sunsets on the lane.',
    'High summer: the cats nap in the shade by noon.', 'Late summer: warm evenings, the first crickets.', 'Early autumn: cool mornings, warm tea.',
    'Autumn: leaves are turning along the lane.', 'Late autumn: frosty mornings, cozy nights in.', 'Early winter: the lane gets its first cold snap.'];
  function seasonNote(date, hemi = 'north') {
    if (!valid(date)) return '';
    const m = (+date.slice(5, 7) - 1 + (hemi === 'south' ? 6 : 0)) % 12;
    return MONTH_NOTES[m];
  }
  // Birthdays and anniversaries already on the calendar, the next 30 days.
  const BIRTHDAY = /birthday|b-?day|anniversar|anniv/i;
  function birthdays({ events = [], today, days = 30 }) {
    if (!valid(today)) return [];
    return events.filter(e => valid(e.date) && BIRTHDAY.test(e.title || '')).map(e => ({ ...e, inDays: daysBetween(today, e.date) }))
      .filter(e => e.inDays >= 0 && e.inDays <= days).sort((a, b) => a.inDays - b.inDays);
  }
  // Seasonal dressing on the street, from the real date and weather.
  function dressing({ date, seasons = [], weather = 'clear' }) {
    let season = '';
    if (valid(date)) {
      const m = +date.slice(5, 7) - 1, d = +date.slice(8, 10), n = m * 100 + d;
      for (const s of seasons) {
        if (!Array.isArray(s.from) || !Array.isArray(s.to)) continue;
        const a = s.from[0] * 100 + s.from[1], b = s.to[0] * 100 + s.to[1];
        if (a <= b ? n >= a && n <= b : n >= a || n <= b) { season = s.group; break; }
      }
    }
    return { season, weather: ['rain', 'storm', 'snow', 'sakura'].includes(weather) ? (weather === 'storm' ? 'rain' : weather) : '' };
  }
  // ---------- The view: a street of four fronts, and the place you're at below it ----------
  // Little pixel fronts, drawn inline so there is nothing to fetch. Windows glow after dusk.
  const FRONTS = {
    house: '<rect x="10" y="26" width="44" height="30" fill="#c99872"/><path d="M6 28 32 8l26 20z" fill="#8f5a4a"/><rect x="18" y="34" width="10" height="9" class="lane-window"/><rect x="36" y="34" width="10" height="9" class="lane-window"/><rect x="27" y="44" width="10" height="12" fill="#6b4334"/><rect x="40" y="12" width="6" height="10" fill="#7a4a3c"/>',
    shop: '<rect x="8" y="24" width="48" height="32" fill="#efe3cf"/><path d="M6 24h52l-4 8H10z" fill="#f07a5a"/><path d="M14 24h6l-2 8h-6zM26 24h6l-1 8h-6zM38 24h6l1 8h-6zM50 24h6l2 8h-6z" fill="#fff4e6"/><rect x="14" y="36" width="20" height="12" class="lane-window"/><rect x="40" y="38" width="10" height="18" fill="#7a5a48"/><rect x="18" y="14" width="28" height="8" rx="2" fill="#3c2d4f"/><circle cx="32" cy="18" r="2" fill="#ffd27a"/>',
    mail: '<rect x="10" y="22" width="44" height="34" fill="#9fb4d8"/><rect x="8" y="18" width="48" height="6" fill="#5b6f9e"/><rect x="16" y="30" width="14" height="10" class="lane-window"/><rect x="38" y="30" width="10" height="26" fill="#43557f"/><rect x="18" y="45" width="10" height="7" fill="#fff6e8"/><path d="M18 45l5 4 5-4" fill="none" stroke="#c0675a" stroke-width="1.4"/>',
    notice: '<rect x="14" y="42" width="4" height="14" fill="#7a5a48"/><rect x="46" y="42" width="4" height="14" fill="#7a5a48"/><rect x="8" y="14" width="48" height="30" rx="2" fill="#a77a58"/><rect x="11" y="17" width="42" height="24" fill="#d9b88e"/><rect x="15" y="20" width="12" height="9" fill="#fff6e8"/><rect x="31" y="21" width="17" height="7" fill="#ffe08a"/><rect x="18" y="31" width="14" height="7" fill="#bfe3d0"/><rect x="36" y="31" width="10" height="8" fill="#f4c2c2"/><circle cx="21" cy="20" r="1.4" fill="#c0675a"/><circle cx="39" cy="21" r="1.4" fill="#5b6f9e"/>',
  };
  // Seasonal dressing, per front: pumpkins on the step (Halloween), string lights and snow on
  // the roofline (winter holidays, or real snow). CSS shows them from the lane's data attributes.
  const DECOR = {
    house: { snow: 'M8 28 32 9l24 19h-5L32 14 13 28z', lights: [[12,27],[18,22],[24,18],[30,13],[36,13],[42,18],[48,22],[53,27]], step: [12, 52] },
    shop: { snow: 'M18 14h28v3H18z', lights: [[9,26],[16,26],[23,26],[30,26],[37,26],[44,26],[51,26]], step: [44, 52] },
    mail: { snow: 'M8 18h48v3H8z', lights: [[11,23],[18,23],[25,23],[32,23],[39,23],[46,23],[53,23]], step: [32, 52] },
    notice: { snow: 'M8 14h48v3H8z', lights: [[11,16],[18,16],[25,16],[32,16],[39,16],[46,16],[53,16]], step: [24, 52] },
  };
  const LIGHT_COLOURS = ['#ff6b6b', '#ffd27a', '#7ed6a3', '#7fb8ff'];
  function decor(id) {
    const d = DECOR[id], [px, py] = d.step;
    return `<path class="lane-snow" d="${d.snow}" fill="#ffffff"/>` +
      `<g class="lane-lights">${d.lights.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${LIGHT_COLOURS[i % 4]}"/>`).join('')}</g>` +
      `<g class="lane-pumpkin"><ellipse cx="${px}" cy="${py + 2}" rx="4" ry="3" fill="#e8782a"/><rect x="${px - .6}" y="${py - 2}" width="1.4" height="2" fill="#5a7a2a"/></g>`;
  }
  const catHead = (coat, name) => `<svg viewBox="0 0 16 14" aria-hidden="true"><title>${String(name).replace(/[<&]/g, '')}</title><path d="M2 13V4l3 2h6l3-2v9z" fill="#${(coat >>> 0).toString(16).padStart(6, '0').slice(-6)}" stroke="#00000040" stroke-width="1"/><rect x="5" y="8" width="1.6" height="1.6" fill="#2a2a2a"/><rect x="9.4" y="8" width="1.6" height="1.6" fill="#2a2a2a"/></svg>`;
  function createView({ model, today, pets = () => [], weather = () => 'clear', seasons = [], location = () => ({}), phase = () => 'day', reducedMotion = () => false, notice = () => {}, sound = {},
    catalog = [], shop = null, thumb = () => '', onBuy = () => {}, openCatalogue = null,
    digest = null, mailbox = null, openLetter = () => {}, calendar = null }) {
    const el = (tag, cls, text, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; if (parent) parent.appendChild(n); return n; };
    const play = name => { try { sound[name]?.(); } catch (e) { /* sounds are optional */ } };
    let place = 'house', dismissedAway = false, town = [];
    // mount(host): draws the lane into the menu tab and returns the house panel, which the
    // app fills with the rooms gallery, house map and guest book exactly as before.
    function mount(host, { awayNote = null } = {}) {
      const lane = el('section', 'lane', undefined, host); lane.dataset.phase = phase();
      const dress = dressing({ date: today(), seasons, weather: weather() });
      if (dress.season) lane.dataset.season = dress.season;
      if (dress.weather) lane.dataset.weather = dress.weather;
      town = residents({ pets: pets(), date: today(), phase: phase() });
      const head = el('div', 'lane-heading', undefined, lane); el('h2', '', 'The Lane', head);
      el('p', 'lane-when muted', new Date(today() + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' }) + ' ' + ({ morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'night', day: '' }[phase()] || '') + ' on the lane', head);
      if (awayNote && !dismissedAway) {
        const note = el('div', 'lane-away', undefined, lane); note.setAttribute('role', 'status');
        el('p', '', awayNote, note); const ok = el('button', 'chipbtn', 'Thanks', note); ok.type = 'button'; ok.onclick = () => { dismissedAway = true; note.remove(); };
      }
      const street = el('div', 'lane-street', undefined, lane); street.setAttribute('role', 'tablist'); street.setAttribute('aria-label', 'Places on the lane');
      const panels = {};
      for (const [id, name, hint] of PLACES) {
        const b = el('button', 'lane-front', undefined, street); b.type = 'button'; b.dataset.place = id; b.setAttribute('role', 'tab'); b.id = 'lane-tab-' + id; b.title = hint;
        const here = at(town, id), faces = here.slice(0, 3).map(r => catHead(r.coat, r.name)).join('') + (here.length > 3 ? `<small>+${here.length - 3}</small>` : '');
        b.innerHTML = `<svg viewBox="0 0 64 60" aria-hidden="true" shape-rendering="crispEdges">${FRONTS[id]}${decor(id)}<rect x="2" y="56" width="60" height="4" fill="#00000022"/></svg>${here.length ? `<span class="lane-residents">${faces}</span>` : ''}<span>${name}</span>`;
        if (here.length) b.setAttribute('aria-label', `${name}: ${here.map(r => r.name).join(', ')} ${here.length === 1 ? 'is' : 'are'} here`);
        const panel = el('div', 'lane-place', undefined, lane); panel.id = 'lane-' + id; panel.dataset.place = id; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', b.id); b.setAttribute('aria-controls', panel.id);
        panels[id] = panel;
        b.onclick = () => choose(id, true);
      }
      street.onkeydown = e => {
        const ids = PLACES.map(p => p[0]), i = ids.indexOf(place), next = e.key === 'ArrowRight' ? ids[(i + 1) % ids.length] : e.key === 'ArrowLeft' ? ids[(i + ids.length - 1) % ids.length] : e.key === 'Home' ? ids[0] : e.key === 'End' ? ids.at(-1) : null;
        if (next) { e.preventDefault(); choose(next, true); street.querySelector(`[data-place=${next}]`).focus(); }
      };
      function choose(id, user = false) {
        if (user && id !== place) play('flip');
        place = id;
        for (const b of street.children) { const on = b.dataset.place === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
        for (const [pid, panel] of Object.entries(panels)) panel.hidden = pid !== id;
        if (id !== 'house') renderPlace(id, panels[id]);
        if (user && !reducedMotion() && panels[id].animate) panels[id].animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      // Who's home: one line above the house content the app fills in.
      const home = at(town, 'house');
      if (home.length) el('p', 'lane-around', sayAround(home), panels.house);
      choose(place);
      return { house: panels.house, choose, get place() { return place; } };
    }
    function renderPlace(id, panel) {
      panel.replaceChildren();
      const here = at(town, id);
      if (here.length) el('p', 'lane-around', sayAround(here), panel);
      try { ({ shop: renderShop, mail: renderMail, notice: renderNotice })[id](panel); }
      catch (e) { el('p', 'muted', 'This place is resting right now. Try again in a moment.', panel); }
    }
    // ---- The Shop: Mallow's shelf ----
    function renderShop(panel) {
      const t = today(), { items, special } = shelf({ catalog, owns: id => shop.owns(id), date: t });
      const keeper = el('div', 'lane-keeper', undefined, panel);
      el('span', 'lane-keeper-face', '🐈', keeper).setAttribute('aria-hidden', 'true');
      const hour = phase(), greet = { morning: 'Morning! Fresh finds on the shelf.', afternoon: 'Afternoon! Have a look around.', evening: 'Evening. Lamps are on, take your time.', night: 'Late visit? I’m always here.' }[hour] || 'Welcome in! Have a look around.';
      const said = el('div', 'lane-keeper-words', undefined, keeper); el('b', '', 'Mallow', said); el('p', '', greet + (special ? ' And it’s Sunday, so there’s something rare.' : ''), said);
      const purse = el('p', 'lane-purse', `${shop.balance} Fireflies`, panel); purse.setAttribute('role', 'status'); purse.setAttribute('aria-live', 'polite');
      el('p', 'muted small lane-earn', 'Fireflies come from finishing tasks, keeping habits and cozy moments. No money, no ads.', panel);
      const shelfRow = el('div', 'lane-shelf', undefined, panel);
      const rows = [...(special ? [special] : []), ...items].map(id => catalog.find(c => c.id === id)).filter(Boolean);
      if (!rows.length) el('p', 'lane-empty', 'You own everything Mallow carries. He’s very proud of your collection.', panel);
      for (const item of rows) {
        const card = el('article', 'lane-item' + (item.id === special ? ' lane-special' : ''), undefined, shelfRow); card.dataset.item = item.id;
        if (item.id === special) el('span', 'lane-tag', 'Sunday special', card);
        const art = thumb(item); if (art) { const img = el('img', '', undefined, card); img.src = art; img.alt = ''; } else el('span', 'lane-item-icon', item.icon || '✦', card).setAttribute('aria-hidden', 'true');
        el('b', '', item.name, card); el('p', 'muted small', item.desc || '', card);
        const buy = el('button', 'chipbtn primary', `${item.price} Fireflies`, card); buy.type = 'button';
        buy.setAttribute('aria-label', `Buy ${item.name} for ${item.price} Fireflies`);
        if (shop.balance < item.price) { buy.disabled = true; buy.title = 'Not enough Fireflies yet'; }
        buy.onclick = () => {
          if (!shop.buy(item.id)) { notice('Not enough Fireflies yet. They come from tasks and cozy moments.'); return; }
          play('arpeggio'); onBuy(item); renderPlace('shop', panel);
          notice(item.costume ? `${item.name} is yours. Find it in the Wardrobe.` : `${item.name} is yours. Find it in Decorate.`);
        };
      }
      el('p', 'muted small', `Tomorrow there are three new finds. Anything you skip comes back within ${cycleDays({ catalog, owns: id => shop.owns(id) })} days.`, panel);
      if (openCatalogue) { const all = el('button', 'chipbtn', 'Everything you own', panel); all.type = 'button'; all.onclick = openCatalogue; }
    }
    // ---- The Mail Room: papers, the Sunday magazine, and letters ----
    function renderMail(panel) {
      el('h3', '', 'Papers', panel);
      const papers = el('div', 'lane-list', undefined, panel);
      try { digest?.ensure(); } catch (e) { /* the archive still lists older papers */ }
      const issues = (digest?.issues() || []).filter(i => i.brief).slice(0, 7);
      if (!issues.length) el('p', 'muted', 'Your first paper arrives tomorrow morning.', papers);
      for (const i of issues) {
        const label = i.date === today() ? 'Today’s paper' : new Date(i.date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        const row = el('button', 'lane-row' + (i.read ? '' : ' unread'), undefined, papers); row.type = 'button';
        el('span', 'lane-row-icon', i.sunday ? '📚' : '🗞', row).setAttribute('aria-hidden', 'true');
        const text = el('span', '', undefined, row); el('b', '', label, text); el('small', '', i.sunday ? 'Sunday edition with the weekly magazine' : 'The Daily Brief', text);
        row.onclick = () => digest.open(i.date);
      }
      el('h3', '', 'Letters', panel);
      const list = el('div', 'lane-list', undefined, panel);
      const mine = mailbox?.unread() || 0;
      if (mine) { const row = el('button', 'lane-row unread', undefined, list); row.type = 'button'; el('span', 'lane-row-icon', '✉', row).setAttribute('aria-hidden', 'true'); const text = el('span', '', undefined, row); el('b', '', mine === 1 ? 'A letter from your past self' : `${mine} letters from your past self`, text); el('small', '', 'Arrived in your mailbox', text); row.onclick = () => mailbox.open(); }
      const specialId = shelf({ catalog, owns: id => shop?.owns(id), date: (() => { const d = new Date(today() + 'T12:00'); d.setDate(d.getDate() - d.getDay()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() }).special;
      for (const letter of letters({ firstVisit: model.firstVisit, today: today(), specialName: catalog.find(c => c.id === specialId)?.name || null })) {
        const read = model.isRead(letter.id), row = el('button', 'lane-row' + (read ? '' : ' unread'), undefined, list); row.type = 'button';
        el('span', 'lane-row-icon', '💌', row).setAttribute('aria-hidden', 'true');
        const text = el('span', '', undefined, row); el('b', '', letter.subject, text); el('small', '', 'From ' + letter.from, text);
        row.onclick = () => { model.markRead(letter.id); openLetter(letter); };
      }
    }
    // ---- The Notice Board: tomorrow and this week, straight from the calendar ----
    function renderNotice(panel) {
      const t = today(), sky = el('p', 'lane-sky', undefined, panel);
      try { const m = calendar?.moon?.(new Date(t + 'T12:00')); sky.textContent = [m ? `${m.icon} ${m.name}.` : '', skyNote(t)].filter(Boolean).join(' '); } catch (e) { sky.textContent = skyNote(t); }
      el('p', 'lane-season-note', seasonNote(t, hemisphere(location())), panel);
      const rows = notices({ today: t, events: calendar?.events() || [], holidays: calendar?.holidays() || [], seasonal: d => calendar?.seasonal(d) || [] });
      const tomorrow = rows.find(r => r.label === 'Tomorrow');
      const pinned = el('div', 'lane-pin', undefined, panel); el('b', '', 'Tomorrow in the house', pinned);
      el('p', '', tomorrow ? tomorrow.items.map(i => i.title).join(' · ') : 'Nothing pinned for tomorrow yet.', pinned);
      el('h3', '', 'This week', panel);
      const week = el('div', 'lane-week', undefined, panel);
      const rest = rows.filter(r => r.label !== 'Tomorrow');
      if (!rest.length) el('p', 'muted', tomorrow ? 'Nothing else pinned this week.' : 'A quiet week on the lane.', week);
      for (const r of rest) { const row = el('div', 'lane-day', undefined, week); el('b', '', r.label, row); const ul = el('ul', '', undefined, row); for (const i of r.items) { const li = el('li', 'lane-' + i.kind, i.title, ul); } }
      const cakes = birthdays({ events: calendar?.events() || [], today: t });
      if (cakes.length) {
        el('h3', '', 'Birthdays coming up', panel);
        const list = el('div', 'lane-week', undefined, panel);
        for (const c of cakes) { const row = el('div', 'lane-day lane-cake', undefined, list); el('b', '', c.inDays === 0 ? 'Today' : c.inDays === 1 ? 'Tomorrow' : `In ${c.inDays} days`, row); el('p', '', '🎂 ' + c.title, row); }
      }
      if (town.length) {
        el('h3', '', 'Who’s where today', panel);
        const names = { house: 'at home', shop: 'at the shop', mail: 'at the Mail Room', notice: 'by the notice board' };
        const list = el('ul', 'lane-who', undefined, panel);
        for (const r of town) { const li = el('li', '', undefined, list); li.innerHTML = catHead(r.coat, r.name); el('span', '', `${r.name} is ${r.doing}` + (/home/.test(r.doing) ? '' : ` (${names[r.place]})`), li); }
      }
      if (calendar?.open) { const b = el('button', 'chipbtn', 'Pin something on the calendar', panel); b.type = 'button'; b.onclick = calendar.open; }
    }
    return { mount, get place() { return place; }, set place(v) { if (PLACES.some(p => p[0] === v)) place = v; } };
  }
  const api = { KEY, PLACES, FRONTS, DOING, residents, sayAround, briefColumn, hemisphere, seasonNote, birthdays, dressing, shelf, cycleDays, away, letters, notices, skyNote, daysBetween, seededOrder, create, createView };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LRLane = api;
})(typeof window !== 'undefined' ? window : globalThis);
