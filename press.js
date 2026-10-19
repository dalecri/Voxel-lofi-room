// The house press: a deterministic story engine for the Daily News (daily front
// page) and the Daily Drift (Sunday magazine). Everything here is a pure
// function of stored, private data. State lives under lr.press, never in rooms
// or share codes. No network and no randomness.
(function (root) {
  const KEY = 'lr.press', DAY = 86400000;
  const day = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => new Date(s + 'T12:00:00');
  const valid = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(+parse(s)) && day(parse(s)) === s;
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return day(d); };
  const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / DAY);
  const dayOf = t => { const d = new Date(t); return Number.isFinite(+d) ? day(d) : ''; };
  const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const rows = v => Array.isArray(v) ? v : [];
  const copy = v => JSON.parse(JSON.stringify(v));
  const clip = (v, n = 120) => String(v ?? '').slice(0, n);
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const ORDINAL = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];
  const ordinal = n => ORDINAL[n - 1] || `${n}th`;
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // What the house can notice. `none` reads in "No ___ in 9 days".
  const KINDS = {
    tea: { label: 'Tea', one: 'tea brew', many: 'tea brews', none: 'tea', drought: 5, gone: 'The kettle is concerned.', run: 'The kettle has stopped asking questions.', first: 'The kettle has been christened.', best: 'The cupboard is running low on mugs.' },
    focus: { label: 'Focus', one: 'focus session', many: 'focus sessions', none: 'focus sessions', drought: 6, gone: 'The garden bed is getting restless.', run: 'The seeds have noticed.', first: 'A seed went into the garden bed.', best: 'The garden is running out of beds.' },
    tasks: { label: 'Tasks', one: 'task finished', many: 'tasks finished', none: 'finished tasks', drought: 4, gone: 'The list has gone very quiet.', run: 'The checklist is starting to trust you.', first: 'The checklist got its first tick.', best: 'The pen needs a rest.' },
    pushups: { label: 'Pushups', one: 'pushup goal', many: 'pushup goals', none: 'pushup goals', drought: 5, gone: 'The tally counter is gathering dust.', run: 'The floor knows you by name.', first: 'Fifty pushups, entered in the record.', best: 'The floor has requested a break.' },
    reps: { label: 'Pushups', one: 'pushup', many: 'pushups', none: 'pushups', drought: 0, gone: '', run: '', first: '', best: 'The tally counter needed a moment.' },
    letter: { label: 'Letters', one: 'letter', many: 'letters', none: 'letters', drought: 21, gone: 'The typewriter clears its throat.', run: 'The ribbon is wearing thin.', first: 'The typewriter has its first page.', best: 'The postbox is impressed.' },
    plant: { label: 'Plants', one: 'plant watered', many: 'plants watered', none: 'watering', drought: 7, gone: 'The ferns have filed a complaint.', run: 'The leaves look smug.', first: 'A plant got its first drink.', best: 'Several plants are now overhydrated and thrilled.' },
    cat: { label: 'Cat dinners', one: 'cat dinner served', many: 'cat dinners served', none: 'cat dinners', drought: 3, gone: 'Dinner bells are being considered.', run: 'The cats suspect a routine.', first: 'The first dinner is served.', best: 'The cats are, for once, satisfied.' },
    french: { label: 'French', one: 'French session', many: 'French sessions', none: 'French', drought: 4, gone: 'Les verbes attendent.', run: 'Très bien, honnêtement.', first: 'Bonjour, le français.', best: 'The flashcards are tired.' },
    daily: { label: 'Daily moments', one: 'daily moment found', many: 'daily moments found', none: 'daily moments', drought: 4, gone: 'The cozy moments are hiding better.', run: 'The room is running out of hiding spots.', first: 'The first cozy moment was found.', best: 'The room is out of secrets.' },
    tip: { label: 'Tips', one: 'tip for Mallow', many: 'tips for Mallow', none: 'tips for Mallow', drought: 14, gone: 'Mallow checks the satchel anyway.', run: 'Mallow has started spinning on arrival.', first: 'Mallow got his first tip.', best: 'Mallow’s satchel has never been heavier.' },
    mischief: { label: 'Cat crimes', one: 'cat crime', many: 'cat crimes', none: 'cat crimes', drought: 10, gone: 'Gravity reports an unusually calm stretch.', run: 'Gravity is filing for overtime.', first: 'The mugs have been put on notice.', best: 'The mugs have formed a union.' },
    sunbeam: { label: 'Sunbeam naps', one: 'sunbeam nap', many: 'sunbeam naps', none: 'sunbeam naps', drought: 7, gone: 'The sunbeams go unreviewed.', run: 'The sun is now on retainer.', first: 'The first sunbeam was claimed.', best: 'The sun has been fully booked.' },
    nap: { label: 'Cat naps', one: 'cat nap', many: 'cat naps', none: 'cat naps', drought: 5, gone: 'The cushions are suspiciously fluffy.', run: 'Napping has become a lifestyle.', first: 'A nap entered the record.', best: 'The cushions are flat.' }
  };
  const DIARY_KINDS = ['mischief', 'sunbeam', 'nap', 'eat'];

  // Story types and which paper owns them. They never overlap.
  const ALLOCATION = {
    news: ['streak', 'first', 'record', 'drought', 'diary', 'forecast'],
    drift: ['week', 'roundup', 'saga', 'gossip', 'behind', 'memory', 'ahead', 'closing']
  };
  const TYPE_LABEL = { streak: 'On a roll', first: 'A first', record: 'House record', drought: 'Gone quiet', diary: 'From the diary', forecast: 'Tomorrow in the house', week: 'Week over week', roundup: 'Records roundup', saga: 'Pet column', gossip: 'Village gossip', behind: 'Behind the week', memory: 'On this day', ahead: 'The week ahead', closing: 'From the editor' };
  const NEWSWORTHY = ['streak', 'first', 'record', 'drought', 'diary'];

  // --- Ledger: one map of kind -> date -> count, built from local stores ----
  function ledger({ activity = [], catLog = [], focus = [], reps = {} } = {}) {
    const L = {}, add = (k, d, n = 1) => { if (!valid(d) || !KINDS[k]) return; (L[k] || (L[k] = {}))[d] = (L[k][d] || 0) + n; };
    for (const row of rows(activity)) if (valid(row?.date)) for (const e of rows(row.events)) if (typeof e === 'string' && e !== 'reps') add(e, row.date);
    // Focus sessions are also logged in the activity log; never count one twice.
    const sessions = {};
    for (const s of rows(focus)) if (s && (s.completed || s.status === 'completed') && valid(s.date)) sessions[s.date] = (sessions[s.date] || 0) + 1;
    for (const [d, n] of Object.entries(sessions)) { L.focus = L.focus || {}; L.focus[d] = Math.max(L.focus[d] || 0, n); }
    for (const e of rows(catLog)) if (e && ['mischief', 'sunbeam', 'nap'].includes(e.kind)) add(e.kind, dayOf(e.time));
    for (const [d, n] of Object.entries(obj(reps))) if (valid(d) && Number.isSafeInteger(n) && n > 0) { L.reps = L.reps || {}; L.reps[d] = n; }
    return L;
  }
  const dates = map => Object.keys(obj(map)).filter(d => map[d] > 0).sort();
  const sum = (map, from, through) => dates(map).filter(d => d >= from && d <= through).reduce((n, d) => n + map[d], 0);
  function runEnding(map, end) { let n = 0, d = end; while ((map[d] || 0) > 0) { n++; d = addDays(d, -1); } return n; }
  function longestRun(list) { let best = 0, n = 0, prev = ''; for (const d of list) { n = prev && diffDays(d, prev) === 1 ? n + 1 : 1; best = Math.max(best, n); prev = d; } return best; }
  const MILESTONES = [3, 5, 7, 10, 14, 21, 30];
  const story = (type, kind, score, headline, body, data = {}) => ({ id: `${type}:${kind}`, type, kind, score, headline, body, data });

  // --- Detectors. Each is (ledger, today) -> stories and never reads a clock. ---
  // Streaks: consecutive days, reported on milestones or when a run beats the house best.
  function streaks(L, today) {
    const out = [];
    for (const kind of Object.keys(L)) {
      if (kind === 'reps') continue;
      const map = L[kind], end = map[today] ? today : map[addDays(today, -1)] ? addDays(today, -1) : '';
      if (!end) continue;
      const n = runEnding(map, end); if (n < 3) continue;
      const start = addDays(end, -(n - 1)), before = longestRun(dates(map).filter(d => d < addDays(start, -1)));
      const best = before >= 3 && n === before + 1;
      if (!MILESTONES.includes(n) && !(n > 30 && n % 10 === 0) && !best) continue;
      const k = KINDS[kind];
      out.push(story('streak', kind, 45 + Math.min(n, 30) * 1.5 + (best ? 15 : 0),
        best ? `${k.label}, ${n} days running: the longest streak on record` : `${k.label}, ${n} days running`,
        `${n} straight days of ${k.many}${best ? `, beating the old record of ${before}` : ''}. ${k.run}`, { n, best, previous: before, end }));
    }
    return out;
  }
  // Firsts: the first time ever a kind appears, today or yesterday. A brand-new
  // house has nothing but firsts, so they only count after a week of history.
  function firsts(L, today) {
    const out = [], yesterday = addDays(today, -1), start = Object.values(L).flatMap(dates).sort()[0];
    if (!start || diffDays(today, start) < 7) return out;
    for (const kind of Object.keys(L)) {
      if (kind === 'reps') continue;
      const first = dates(L[kind])[0]; if (first !== today && first !== yesterday) continue;
      const k = KINDS[kind];
      out.push(story('first', kind, 62, `First ${k.one} on record`, `The house logged its first ${k.one} ${first === today ? 'today' : 'yesterday'}. ${k.first}`, { date: first }));
    }
    return out;
  }
  // Records: a new best day, or a new best rolling week, set today or yesterday.
  function records(L, today) {
    const out = [], yesterday = addDays(today, -1);
    for (const kind of Object.keys(L)) {
      const map = L[kind], k = KINDS[kind], list = dates(map);
      if (!list.length) continue;
      let found = null;
      for (const d of [today, yesterday]) {
        const n = map[d] || 0; if (!n) continue;
        const prev = Math.max(0, ...list.filter(x => x < d).map(x => map[x]));
        if (n >= 2 && prev >= 1 && n > prev) { found = story('record', kind, 66 + Math.min(n, 10), kind === 'reps' ? `${n} pushups ${d === today ? 'today' : 'yesterday'}, a house best` : `${ordinal(n)} ${k.one} ${d === today ? 'today' : 'yesterday'}, a house record`, `The previous best was ${prev} in a day. ${k.best}`, { scope: 'day', n, previous: prev, date: d }); break; }
      }
      if (!found && kind !== 'reps' && (map[today] || map[yesterday])) {
        const week = sum(map, addDays(today, -6), today);
        let prevBest = 0, blocks = 0;
        for (let end = addDays(today, -7); end >= list[0]; end = addDays(end, -7)) { blocks++; prevBest = Math.max(prevBest, sum(map, addDays(end, -6), end)); }
        if (blocks >= 2 && week >= 3 && prevBest >= 1 && week > prevBest) found = story('record', kind, 64 + Math.min(week, 10), `${ordinal(week)} ${k.one} this week, a house record`, `No week before this one managed more than ${prevBest}. ${k.best}`, { scope: 'week', n: week, previous: prevBest });
      }
      if (found) out.push(found);
    }
    return out;
  }
  // Droughts: days since an established habit last happened, at its threshold and every week after.
  function droughts(L, today) {
    const out = [];
    for (const kind of Object.keys(L)) {
      const k = KINDS[kind]; if (!k.drought) continue;
      const list = dates(L[kind]).filter(d => d <= today); if (list.length < 3) continue;
      const last = list[list.length - 1], days = diffDays(today, last);
      if (days < k.drought || (days - k.drought) % 7) continue;
      out.push(story('drought', kind, 40 + Math.min(days, 30), `No ${k.none} in ${days} days`, `${k.gone} Last seen on ${WEEKDAYS[parse(last).getDay()]}, ${last}.`, { days, last }));
    }
    return out;
  }
  // Week over week: the seven days ending `end` against the seven before.
  function weekChange(L, end) {
    const out = [];
    for (const kind of Object.keys(L)) {
      if (kind === 'reps') continue;
      const map = L[kind], now = sum(map, addDays(end, -6), end), before = sum(map, addDays(end, -13), addDays(end, -7)), k = KINDS[kind];
      if (before >= 2 && now >= before * 2) out.push(story('week', kind, 35 + (now - before) * 2, `${k.label} up: ${now} this week, ${before} the week before`, `${cap(k.many)} more than doubled. Someone found a rhythm.`, { now, before, direction: 'up' }));
      else if (before >= 4 && now * 2 <= before) out.push(story('week', kind, 35 + (before - now) * 2, `${k.label} down: ${now} this week, ${before} the week before`, `${cap(k.many)} halved. No judgement, just the numbers.`, { now, before, direction: 'down' }));
    }
    return out;
  }
  // Roundup: each kind's total for the week ending `end` against its best earlier week.
  function roundup(L, end) {
    const lines = [];
    for (const kind of Object.keys(L).sort()) {
      if (kind === 'reps') continue;
      const map = L[kind], list = dates(map), now = sum(map, addDays(end, -6), end); if (!now) continue;
      let best = 0; for (let e = addDays(end, -7); list.length && e >= list[0]; e = addDays(e, -7)) best = Math.max(best, sum(map, addDays(e, -6), e));
      lines.push({ kind, now, best, isBest: now > best && best > 0, text: `${KINDS[kind].label}: ${now} this week${best ? now > best ? ` (new house best, was ${best})` : ` (house best ${best})` : ''}` });
    }
    lines.sort((a, b) => Number(b.isBest) - Number(a.isBest) || b.now - a.now || a.kind.localeCompare(b.kind));
    const reps = L.reps ? Math.max(0, ...dates(L.reps).filter(d => d >= addDays(end, -6) && d <= end).map(d => L.reps[d])) : 0;
    if (reps) lines.push({ kind: 'reps', now: reps, best: 0, isBest: false, text: `Most pushups in a day this week: ${reps}` });
    return lines;
  }
  // The busiest single day in a week, for the magazine's "behind the week" desk.
  function busiest(L, from, through) {
    let top = null;
    for (let d = from; d <= through; d = addDays(d, 1)) {
      const parts = Object.keys(L).filter(k => k !== 'reps' && L[k][d]).sort().map(k => [k, L[k][d]]), total = parts.reduce((n, [, c]) => n + c, 0);
      if (total && (!top || total > top.total)) top = { date: d, total, parts };
    }
    if (!top || top.total < 2) return null;
    return { ...top, text: `${WEEKDAYS[parse(top.date).getDay()]} was the week’s busiest day: ${top.parts.map(([k, n]) => `${n} ${n === 1 ? KINDS[k].one : KINDS[k].many}`).join(', ')}.` };
  }

  // --- Tomorrow in the house ------------------------------------------------
  const clock = iso => { const d = new Date(iso); if (!Number.isFinite(+d)) return ''; const h = d.getHours(), m = d.getMinutes(); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`; };
  const SKY = { rain: 'rain on the way', storm: 'storms likely', snow: 'snow likely', clear: 'clear skies' };
  function forecast({ today, events = [], google = [], tasks = [], weather = null, L = {} }) {
    const tomorrow = addDays(today, 1);
    const list = [
      ...rows(events).filter(e => e && e.date === tomorrow && typeof e.title === 'string').map(e => ({ title: clip(e.title, 90), time: '', at: '' })),
      ...rows(google).filter(e => e && typeof e.title === 'string' && valid(e.date) && e.date <= tomorrow && (e.endDate || e.date) >= tomorrow && (!e.allDay || e.date === tomorrow || (e.endDate || e.date) > tomorrow)).map(e => ({ title: clip(e.title, 90), time: e.startAt ? clock(e.startAt) : '', at: e.startAt || '' }))
    ].sort((a, b) => (a.at ? 0 : 1) - (b.at ? 0 : 1) || String(a.at).localeCompare(String(b.at)) || a.title.localeCompare(b.title));
    const due = rows(tasks).filter(t => t && t.due === tomorrow && typeof t.title === 'string').map(t => clip(t.title, 90)).sort();
    const wx = rows(weather?.forecast).find(f => f && f.date === tomorrow);
    const sky = wx ? `${cap(SKY[wx.condition] || SKY.clear)}, ${Math.round(wx.low)}° to ${Math.round(wx.high)}°` : '';
    // One prediction line: what is booked, what the sky brings, and what the habits suggest.
    const timed = list.find(e => e.time), booked = timed ? `${timed.title} at ${timed.time}` : list[0] ? `${list[0].title} on the calendar` : '';
    const clause = [booked, wx ? SKY[wx.condition] || SKY.clear : ''].filter(Boolean).join(', ');
    let habit = '';
    const live = Object.keys(L).filter(k => k !== 'reps' && (L[k][today] || 0) > 0).map(k => [k, runEnding(L[k], today)]).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (live) habit = `${KINDS[live[0]].label} streak on the line: day ${live[1] + 1}.`;
    else {
      const wd = parse(tomorrow).getDay(), past = [1, 2, 3, 4].map(w => addDays(tomorrow, -7 * w));
      const usual = Object.keys(L).filter(k => k !== 'reps').map(k => [k, past.filter(d => L[k][d]).length]).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      if (usual) habit = `${WEEKDAYS[wd]}s usually bring ${KINDS[usual[0]].many} (${usual[1]} of the last 4).`;
      else { const quiet = droughts(L, today)[0] || null; if (quiet) habit = `Odds of ${KINDS[quiet.kind].none} tomorrow: improving.`; }
    }
    const prediction = [clause ? cap(clause) + '.' : '', habit].filter(Boolean).join(' ') || 'A blank page tomorrow. The house has no plans, which is also a plan.';
    return { date: tomorrow, events: list.map(({ title, time }) => ({ title, time })), tasks: due, weather: sky, prediction };
  }

  // --- Pet sagas: serialized columns with a weekly state machine ---------------
  const SAGAS = {
    dinner: { title: 'The Dinner-Time Campaign', noun: 'campaign', evidence: ['dinner', 'dinners'], kinds: ['eat'], house: ['cat'], night: false,
      chapters: ['opens negotiations over the dinner schedule. Demands: earlier, larger, immediately.', 'escalates to sitting beside the bowl and staring at the clock.', 'introduces the 5am paw to the face. Talks are described as tense.', 'secures {count} {evidence} and calls it a partial concession.', 'declares victory and starts drafting demands for second breakfast.'],
      ending: 'claims total victory' },
    fridge: { title: 'The Late-Night Fridge Inquiry', noun: 'inquiry', evidence: ['late-night sighting', 'late-night sightings'], kinds: [], house: [], night: true,
      chapters: ['opens an investigation into who keeps opening the fridge after dark.', 'interviews the kitchen tiles. They are not talking.', 'logs {count} {evidence} near the fridge and names no suspects.', 'stakes out the counter overnight. Snacks are confiscated as evidence.', 'files a final report: the human did it.'],
      ending: 'closes the file with the human as prime suspect' },
    sunbeam: { title: 'Sunbeam Reviews', noun: 'review season', evidence: ['sunbeam tested', 'sunbeams tested'], kinds: ['sunbeam', 'nap'], house: [], night: false,
      chapters: ['opens the review season. The windowsill beam earns a cautious three paws.', 'awards the hallway patch four paws for warmth, deducting one for foot traffic.', 'tests {count} {evidence} and complains the sun keeps moving.', 'publishes a ranking. The bed by the window is untouchable.', 'retires the column at the top of the sunbeam charts.'],
      ending: 'retires with five paws for the bedroom window' },
    gravity: { title: 'The Gravity Hearings', noun: 'hearings', evidence: ['object tested', 'objects tested'], kinds: ['mischief'], house: [], night: false,
      chapters: ['opens hearings on whether gravity still works on the shelf.', 'presents a pen as evidence. The pen hit the floor. Gravity holds.', 'submits {count} more {evidence}. The mugs request protection.', 'is warned by the court. Objects continue to fall.', 'rules that gravity works and asks for a recount anyway.'],
      ending: 'rests the case, and three mugs' }
  };
  const SEED = [['Cali', 'sunbeam'], ['Neo', 'dinner'], ['Diego', 'gravity'], ['Ramses', 'fridge']];
  const seedSagas = () => SEED.map(([cat, saga]) => ({ cat, saga, season: 1, week: 1, chapter: 0, quiet: 0, hits: 0, lastWeek: '', log: [{ week: '', n: 1, outcome: 'seed', count: 0 }] }));
  const validSaga = s => s && typeof s.cat === 'string' && SAGAS[s.saga] && [s.season, s.week, s.chapter, s.quiet, s.hits].every(Number.isSafeInteger);
  // Evidence in the recap window: the cat's own diary lines, plus house events.
  function sagaEvidence(saga, cat, { catLog = [], L = {} } = {}, from, through) {
    const def = SAGAS[saga], name = String(cat).toLowerCase();
    let n = 0;
    for (const e of rows(catLog)) {
      if (!e || String(e.name || '').toLowerCase() !== name) continue;
      const d = dayOf(e.time); if (!d || d < from || d > through) continue;
      const h = new Date(e.time).getHours();
      if (def.kinds.includes(e.kind) || (def.night && (h >= 22 || h < 5))) n++;
    }
    for (const kind of def.house) n += sum(L[kind] || {}, from, through);
    return n;
  }
  // advance: evidence moves the story on. stay: a quiet week keeps the counter running.
  // reset: three quiet weeks go cold, or the last chapter resolves; a new season opens.
  function advanceSaga(s, count, weekKey) {
    const def = SAGAS[s.saga], next = copy(s);
    if (!next.lastWeek) { next.lastWeek = weekKey; if (next.log[next.log.length - 1]) next.log[next.log.length - 1].week = weekKey; return { saga: next, outcome: 'seed' }; }
    if (next.lastWeek === weekKey) return { saga: next, outcome: 'same' };
    let outcome;
    const finished = next.week;
    if (count > 0) {
      next.quiet = 0; next.hits += count;
      if (next.chapter + 1 >= def.chapters.length) { outcome = 'reset'; next.reason = 'resolved'; next.ended = finished + 1; next.season++; next.week = 1; next.chapter = 0; }
      else { outcome = 'advance'; next.week++; next.chapter++; }
    } else {
      next.quiet++;
      if (next.quiet >= 3) { outcome = 'reset'; next.reason = 'cold'; next.ended = finished + 1; next.season++; next.week = 1; next.chapter = 0; next.quiet = 0; }
      else { outcome = 'stay'; next.week++; }
    }
    if (outcome !== 'reset') { delete next.reason; delete next.ended; }
    next.lastWeek = weekKey;
    next.log = [...rows(next.log), { week: weekKey, n: next.week, outcome, count }].slice(-6);
    return { saga: next, outcome };
  }
  function column(s) {
    const def = SAGAS[s.saga], entry = rows(s.log)[rows(s.log).length - 1] || { outcome: 'seed', count: 0 }, prior = rows(s.log)[rows(s.log).length - 2];
    const count = entry.count || 0, evidence = def.evidence[count === 1 ? 0 : 1];
    const chapter = def.chapters[s.chapter].replace('{count}', count).replace('{evidence}', evidence);
    const last = prior ? prior.outcome === 'advance' ? ` Last week the ${def.noun} moved forward.` : prior.outcome === 'stay' ? ' Last week brought no developments.' : prior.outcome === 'seed' ? ` Week 1 opened the file.` : '' : '';
    let headline = `${s.cat}: ${def.title}, week ${s.week}`, body;
    if (entry.outcome === 'reset' && s.reason === 'cold') body = `${def.title} went cold after three quiet weeks. ${s.cat} denies it ever happened. Season ${s.season} opens with a fresh file: ${s.cat} ${def.chapters[0]}`;
    else if (entry.outcome === 'reset') body = `${def.title} concludes after ${s.ended} weeks. ${s.cat} ${def.ending}. Season ${s.season}, week 1: ${s.cat} ${def.chapters[0]}`;
    else if (entry.outcome === 'stay') body = `Week ${s.week} of the ${def.noun}. No new developments. ${s.cat} is understood to be regrouping.${last}`;
    else if (entry.outcome === 'advance') body = `Week ${s.week} of the ${def.noun}. ${s.cat} ${chapter} (${count} ${evidence} on file this week.)${last}`;
    else body = `Week 1 of ${def.title}. ${s.cat} ${chapter}`;
    if (s.season > 1 && entry.outcome !== 'reset') headline = `${s.cat}: ${def.title}, season ${s.season}, week ${s.week}`;
    return { headline, body };
  }

  // --- Village gossip from the house's own rooms --------------------------------
  function gossip(index, snapshot) {
    const list = rows(index).filter(r => r && r.id != null).map(r => ({ id: String(r.id), name: clip(r.name || 'An unnamed room', 60), n: Number.isSafeInteger(r.n) ? r.n : 0 }));
    const lines = [], seen = obj(snapshot), had = Object.keys(seen).length > 0;
    for (const r of list) {
      if (!had) continue;
      if (!(r.id in seen)) lines.push(`A new address on the street: ${r.name}.`);
      else if (r.n - seen[r.id] >= 3) lines.push(`${r.name} grew by ${r.n - seen[r.id]} pieces since the last issue. The neighbours have noticed.`);
      else if (seen[r.id] - r.n >= 3) lines.push(`${r.name} was pared back by ${seen[r.id] - r.n} pieces. Minimalism is rumoured.`);
    }
    if (!lines.length && list.length) {
      const top = [...list].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))[0];
      lines.push(list.length > 1 ? `${top.name} remains the busiest address on the street, with ${top.n} pieces. ${list.length - 1} other room${list.length === 2 ? '' : 's'} kept quiet.` : `${top.name} is the only address on the street, with ${top.n} pieces. The street is very exclusive.`);
    }
    return { lines: lines.slice(0, 3), snapshot: Object.fromEntries(list.map(r => [r.id, r.n])) };
  }

  // --- Reader preferences: claps boost a type; four ignored editions shrink it ---
  const boost = (prefs, type) => 1 + .15 * Math.min(obj(prefs?.claps)[type] || 0, 10);
  const shrunk = (prefs, type) => (obj(prefs?.ignored)[type] || 0) >= 4;
  function rank(stories, prefs) {
    return rows(stories).map(s => ({ ...s, shrunk: shrunk(prefs, s.type), rankScore: Math.round(s.score * boost(prefs, s.type) * (shrunk(prefs, s.type) ? .6 : 1) * 100) / 100 }))
      .sort((a, b) => b.rankScore - a.rankScore || a.id.localeCompare(b.id));
  }
  // A new edition settles the previous one: each type it showed without a clap counts as ignored.
  function settle(prefs, paper, key, types) {
    const next = { claps: { ...obj(prefs?.claps) }, ignored: { ...obj(prefs?.ignored) }, last: { ...obj(prefs?.last) } }, last = next.last[paper];
    if (last && last.key === key) { next.last[paper] = { ...last, types: [...new Set([...rows(last.types), ...types])].sort() }; return next; }
    if (last) for (const type of rows(last.types)) if (!rows(last.clapped).includes(type)) next.ignored[type] = (next.ignored[type] || 0) + 1;
    next.last[paper] = { key, types: [...new Set(types)].sort(), clapped: [] };
    return next;
  }
  function clap(prefs, paper, type) {
    const next = { claps: { ...obj(prefs?.claps) }, ignored: { ...obj(prefs?.ignored) }, last: { ...obj(prefs?.last) } };
    next.claps[type] = (next.claps[type] || 0) + 1; next.ignored[type] = 0;
    const last = next.last[paper]; if (last) next.last[paper] = { ...last, clapped: [...new Set([...rows(last.clapped), type])].sort() };
    return next;
  }
  // Slim edition: no pattern stories and no diary news means no full front page.
  const isSlim = stories => !rows(stories).some(s => NEWSWORTHY.includes(s.type));
  const strongest = stories => { const seen = new Set(); return rows(stories).filter(s => !seen.has(s.kind) && seen.add(s.kind)); };

  // Drift base priority; claps reorder within the magazine, closing always last.
  const PRIORITY = { saga: 50, week: 46, roundup: 42, behind: 40, gossip: 34, ahead: 24, memory: 22 };

  function create({ store, now = () => new Date() }) {
    function read() {
      const s = obj(store.get(KEY, null));
      return { v: 1, claps: obj(s.claps), ignored: obj(s.ignored), last: obj(s.last), sagas: Array.isArray(s.sagas) ? s.sagas.filter(validSaga) : seedSagas(), rooms: obj(s.rooms), reps: obj(s.reps) };
    }
    let state = read();
    const save = () => { store.set(KEY, state); };
    if (!store.get(KEY, null)) save();
    const prefs = () => ({ claps: state.claps, ignored: state.ignored, last: state.last });
    const setPrefs = p => { state.claps = p.claps; state.ignored = p.ignored; state.last = p.last; };
    // Keep the daily pushup tally's best count, so records survive the counter's reset.
    function keepReps(tally) {
      if (!tally || !valid(tally.date) || !Number.isSafeInteger(tally.count) || tally.count <= 0) return false;
      if ((state.reps[tally.date] || 0) >= tally.count) return false;
      state.reps[tally.date] = tally.count;
      state.reps = Object.fromEntries(Object.entries(state.reps).sort().slice(-120));
      return true;
    }
    function ledgerFor(src) { return ledger({ activity: src.activity, catLog: src.catLog, focus: src.focus, reps: state.reps }); }
    function news(src = {}) {
      state = read();
      const today = day(now()), changedReps = keepReps(src.tally), L = ledgerFor(src);
      const found = strongest(rank([...records(L, today), ...firsts(L, today), ...streaks(L, today), ...droughts(L, today)], prefs()));
      const diary = src.diary || null;
      const diaryStory = diary?.lead ? story('diary', 'diary', 20, diary.headline, diary.dek, { lead: diary.lead }) : null;
      const ranked = rank([...found, ...(diaryStory ? [diaryStory] : [])], prefs()).slice(0, 6);
      const box = forecast({ today, events: src.events, google: src.google, tasks: src.tasks, weather: src.weather, L });
      const before = JSON.stringify(prefs());
      setPrefs(settle(prefs(), 'news', today, [...ranked.map(s => s.type), 'forecast']));
      if (changedReps || JSON.stringify(prefs()) !== before) save();
      const slim = isSlim(ranked), lead = ranked[0] || null;
      return { date: today, day: diary?.day || 0, slim, lead, stories: ranked.slice(1), diary: rows(diary?.remaining), forecast: { ...box, shrunk: shrunk(prefs(), 'forecast') },
        sections: [...(found.length ? ['House patterns'] : []), ...rows(diary?.sections)], reaction: diary?.reaction || '' };
    }
    // Sections for one Drift issue. Saga state advances once per issue week.
    function magazine(issue, src = {}) {
      state = read();
      const L = ledgerFor(src), out = [], add = (id, type, title, body, extra = {}) => out.push({ id, type, title, body, ...extra });
      const sagas = state.sagas.map(s => advanceSaga(s, sagaEvidence(s.saga, s.cat, { catLog: src.catLog, L }, issue.from, issue.through), issue.week).saga);
      state.sagas = sagas;
      for (const s of sagas) { const c = column(s); add('saga-' + s.cat.toLowerCase(), 'saga', c.headline, c.body, { cat: s.cat, week: s.week, season: s.season }); }
      const changes = weekChange(L, issue.through).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3);
      if (changes.length) add('changes', 'week', 'Week over week', changes.map(c => `${c.headline}. ${c.body}`).join('\n'));
      const bests = roundup(L, issue.through);
      if (bests.length) add('roundup', 'roundup', 'Records roundup', bests.slice(0, 6).map(l => l.text).join('\n'));
      const top = busiest(L, issue.from, issue.through);
      if (top) add('busiest', 'behind', 'The busiest day', top.text);
      const street = gossip(src.rooms, state.rooms);
      if (street.lines.length) add('village', 'gossip', 'Word on the street', street.lines.join(' '));
      state.rooms = street.snapshot;
      save();
      return out;
    }
    // Order a whole issue: ranked by base priority and claps, closing last.
    function arrange(sections) {
      const p = prefs(), scored = rows(sections).map((s, i) => ({ s, i, score: s.type === 'closing' ? -1 : (PRIORITY[s.type] || 30) * boost(p, s.type) }));
      return scored.sort((a, b) => b.score - a.score || a.i - b.i).map(x => x.s);
    }
    function seen(paper, key, types) { state = read(); const before = JSON.stringify(prefs()); setPrefs(settle(prefs(), paper, key, types)); if (JSON.stringify(prefs()) !== before) save(); }
    function applaud(paper, type) { state = read(); setPrefs(clap(prefs(), paper, type)); save(); return state.claps[type]; }
    return { news, magazine, arrange, seen, clap: applaud, clapped: (paper, type) => rows(read().last[paper]?.clapped).includes(type), claps: type => read().claps[type] || 0, isShrunk: type => shrunk(read(), type), get state() { return copy(read()); } };
  }

  const api = { KEY, KINDS, ALLOCATION, TYPE_LABEL, NEWSWORTHY, SAGAS, SEED, ledger, streaks, firsts, records, droughts, weekChange, roundup, busiest, forecast, seedSagas, sagaEvidence, advanceSaga, column, gossip, rank, settle, clap, boost, shrunk, isSlim, create, addDays, day };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LRPress = api;
})(typeof window !== 'undefined' ? window : globalThis);
