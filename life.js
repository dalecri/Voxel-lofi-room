// The small, unscheduled lives around the room. Persistence uses the same Store as saves.
(function (root) {
  function merchant({ store, today, owns, catalog, now = Date.now, random = Math.random }) {
    let trip = store.get('lr.merchant', null), date = today(), wait = 45 + random() * 60;
    const active = () => !!trip && trip.date === today() && trip.until > now();
    function tick(dt, allowed, cozy = 0.5) {
      if (date !== today()) { date = today(); wait = 45 + random() * 60; }
      if (active() || (trip && trip.date === today()) || !allowed) return active();
      wait -= Math.max(0, dt) * (0.8 + Math.max(0, Math.min(1, cozy)) * 0.4);
      if (wait > 0) return false;
      const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const unowned = shuffle(catalog.filter(c => !owns(c.id))), outfit = unowned.find(c => c.costume);
      // An outfit leads the satchel while any remain; the visit still has exactly three wares.
      const wares = [...(outfit ? [outfit] : []), ...unowned.filter(c => c !== outfit), ...shuffle(catalog.filter(c => owns(c.id)))].slice(0, 3).map(c => c.id);
      trip = { date: today(), wares, until: now() + 180000 };
      store.set('lr.merchant', trip);
      return true;
    }
    function linger() {
      if (active() && trip.until - now() < 30000) { trip.until = now() + 60000; store.set('lr.merchant', trip); }
    }
    return { tick, linger, get active() { return active(); }, get wares() { return active() ? trip.wares.slice() : []; }, offers: id => active() && trip.wares.includes(id) };
  }

  function journal({ store, now = Date.now, random = Math.random }) {
    let entries = store.get('lr.catJournal', []);
    const lines = {
      mischief: ['Knocked over the {thing}. No regrets.', 'The {thing} was too close to the edge. I helped.', 'Tested gravity on the {thing}. Still works.'],
      nap: ['Napped. Woke up. Put another nap in the diary.', 'Held the room down with my whole body. Important work.'],
      sunbeam: ['Napped in the sunbeam. Solar charging complete.', 'The sun moved. Rude. I followed it.'],
      rain: ['Watched the rain from my dry side of the window.', 'Counted raindrops. Lost count. Started again.'],
      pet: ['Accepted a head scratch. You may continue.', 'Was told I am a good cat. Finally, accurate reporting.'],
      forgive: ['Forgave the human. We will not be discussing the terms.', 'Allowed a cuddle. This changes nothing. Mostly.'],
      ignore: ['Ignored the human. Very busy being mysterious.'],
      eat: ['Inspected dinner. Ate the evidence.', 'Ate like I had never been fed. A convincing performance.'],
      merchant: ['A cat arrived with bags. None contained tuna. Suspicious.', 'Met the traveling merchant. Offered him a hairball. He declined.'],
    };
    function write(cat, kind, room, thing = '') {
      if (!cat || cat.visitor || cat.t !== 'cat' || !lines[kind]) return false;
      const time = now();
      if (entries.some(e => e.cat === cat.id && e.room === room && e.kind === kind && time - e.time < 600000)) return false;
      const choices = lines[kind], text = choices[Math.floor(random() * choices.length)].replace('{thing}', thing);
      entries.unshift({ time, room, cat: cat.id, name: cat.name, coat: cat.c, kind, text });
      entries = entries.slice(0, 120); store.set('lr.catJournal', entries);
      return true;
    }
    return { write, get entries() { return entries.slice(); } };
  }

  // Daily news is a view of journal feeds, independent of the weekly digest.
  // Retain dates beyond the cat diary's rolling 120-entry window. Undated legacy
  // discoveries stay in the checklist; we never invent a discovery date for them.
  function newspaper({ store, now = Date.now, moments = [] }) {
    const dateOf = value => {
      const d = new Date(value);
      return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
    };
    let state = store.get('lr.journalNews', { days: [], moments: [] });
    state = { days: Array.isArray(state?.days) ? state.days : [], moments: Array.isArray(state?.moments) ? state.moments : [] };
    function retain(dates) {
      const days = [...new Set([...state.days, ...dates].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
      if (JSON.stringify(days) !== JSON.stringify(state.days)) { state.days = days; store.set('lr.journalNews', state); }
    }
    function record(id) {
      if (state.moments.some(e => e.id === id)) return;
      const time = now(); state.moments.push({ id, time, date: dateOf(time) });
      retain([dateOf(time)]); store.set('lr.journalNews', state);
    }
    const reactions = [
      'The evidence suggests a room in excellent company.',
      'Another quiet field report. The residents remain fascinating.',
      'I have reviewed the findings. A small cup of tea seems appropriate.',
      'Life continues here at a very respectable, unhurried pace.'
    ];
    function edition(cats = []) {
      const date = dateOf(now()), daily = store.get('lr.dailyLog', []);
      retain([...cats.map(e => dateOf(e.time)), ...state.moments.map(e => e.date), ...daily.map(e => e.date)]);
      const catRows = cats.filter(e => dateOf(e.time) === date).map(e => ({
        type: 'cat', time: e.time, key: `${e.cat}:${e.time}:${e.text}`, title: `${e.name || 'A resident cat'}: ${String(e.text || 'A quiet observation').split(/[.!?]/)[0]}`, text: e.text
      })).sort((a,b) => b.time-a.time || a.key.localeCompare(b.key));
      const known = [...state.moments, ...daily.filter(e => !state.moments.some(m => m.id===e.id && m.date===e.date)).map(e => ({...e,time:new Date(e.date+'T00:00').getTime()}))];
      const momentRows = known.filter(e => e.date === date).map(e => {
        const m = moments.find(m => m[0] === e.id);
        return {type:'moment', time:e.time, key:`${e.id}:${e.date}`, title:m ? m[1] : e.id, text:m ? m[2] : 'A little moment was noticed in the room.'};
      }).sort((a,b) => b.time-a.time || a.key.localeCompare(b.key));
      const entries = [...catRows, ...momentRows], lead = entries[0] || null;
      const key = lead ? lead.key : date;
      let hash = 0; for (const c of key) hash = (Math.imul(hash,31)+c.charCodeAt(0)) >>> 0;
      return { date, day:state.days.length, lead, remaining:entries.slice(1),
        sections:[...(momentRows.length ? ['Little moments'] : []), ...(catRows.length ? ['The cats’ version'] : [])],
        headline:lead ? lead.title.toUpperCase() : 'No news today. The presses rest.',
        dek:lead ? (lead.type==='cat' ? `“${lead.text}” The resident considers the matter settled.` : `${lead.text} Our observer has entered it in the record.`) : 'A quiet room is still a good place to be.',
        reaction:reactions[hash % reactions.length] };
    }
    return {record, edition};
  }

  function ambience({ random = Math.random } = {}) {
    let wait = 30 + random() * 35;
    return { tick(dt, allowed, options) {
      if (!allowed) return null;
      wait -= Math.max(0, dt);
      if (wait > 0) return null;
      wait = 45 + random() * 60;
      const choices = ['train', 'leaves'];
      if (options.window && !options.rain && options.day) choices.push('butterfly');
      return choices[Math.floor(random() * choices.length)];
    } };
  }
  const api = { merchant, journal, newspaper, ambience };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRLife = api;
})(typeof window !== 'undefined' ? window : globalThis);
