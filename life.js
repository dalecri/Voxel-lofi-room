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
  const api = { merchant, journal, ambience };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRLife = api;
})(typeof window !== 'undefined' ? window : globalThis);
