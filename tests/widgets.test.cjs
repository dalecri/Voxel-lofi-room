const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../widgets.js');
const LR = require('../room.js');
require('../furniture.js');
require('../packs/library.js');
function store(initial = {}) {
  const values = JSON.parse(JSON.stringify(initial));
  return { values, get: (k, d) => values[k] ?? d, set: (k, v) => { values[k] = JSON.parse(JSON.stringify(v)); } };
}
const row = { title: 'A good bit of news', url: 'https://www.cbc.ca/news/story', source: 'CBC News' };

test('30 mixed French words rotate by local civil date, including DST and midnight', () => {
  assert.equal(W.WORDS.length, 30);
  const a = W.wordOfDay(new Date(2026, 9, 15, 0)), b = W.wordOfDay(new Date(2026, 9, 15, 23, 59, 59));
  assert.deepEqual(a, b); assert.notEqual(a.word, W.wordOfDay(new Date(2026, 9, 16)).word);
  assert.equal(a.word, W.wordOfDay(new Date(2026, 10, 14)).word);
  for (const day of [new Date(2026, 2, 8), new Date(2026, 10, 1)]) {
    const next = new Date(day); next.setDate(day.getDate() + 1);
    assert.notEqual(W.wordOfDay(day).word, W.wordOfDay(next).word);
  }
  for (const def of Object.values(W.WIDGETS)) for (const key of ['id', 'furnitureId', 'dataSource', 'refreshCadence', 'render']) assert.ok(def[key]);
});

test('French desk note is local, never attaches to the fridge, and updates at midnight', async () => {
  const s = store(); let d = new Date(2026, 9, 15, 23, 59);
  const w = W.create({ store: s, now: () => d });
  await w.refresh(['minifridge']);assert.equal(w.data('fridge-note').word,undefined);assert.equal(W.attached('minifridge'),undefined);assert.equal(W.attached('frenchdesk').surface,'desk');
  await w.refresh(['frenchdesk']); const before = w.data('fridge-note');
  d = new Date(2026, 9, 16); await w.refresh(['frenchdesk']);
  assert.notEqual(before.word, w.data('fridge-note').word);
  assert.deepEqual(Object.keys(s.values), ['lr.widgets']);
});

test('retired news and portal caches never restore links or start a fetch', async () => {
  const s=store({'lr.widgets':{newspaper:{headlines:[row]},'pomodoro-candle':{url:'https://example.com/retired'},'app-portals':{portals:[{furnitureId:'terrarium',url:'https://example.com/retired'}]}}});
  const oldFetch=global.fetch;let requests=0;global.fetch=()=>{requests++;throw Error('Unexpected network');};
  try {const w=W.create({store:s});await Promise.all(Array.from({length:4},()=>w.refresh(['newspaper','pomodorocandle','terrarium','libcase','gamingdesk','frenchdesk','arcade'])));
    assert.equal(requests,0);assert.equal(w.data('newspaper'),undefined);assert.equal(W.WIDGETS.newspaper,undefined);assert.equal(W.RSS,undefined);assert.equal(W.parseRSS,undefined);
    for(const type of ['newspaper','pomodorocandle','terrarium','libcase','gamingdesk']){assert.equal(W.attached(type),undefined);assert.deepEqual(w.destinations(type),[]);}
    assert(!JSON.stringify(w.state).includes('retired'));assert(w.data('fridge-note').word);assert.deepEqual(w.destinations('arcade'),[{label:'HTML games',url:'https://heycristobal.com/my-collection/'}]);
  } finally {global.fetch=oldFetch;}
  assert.equal(W.articleURL('javascript:alert(1)'), '');assert.equal(W.articleURL('data:text/html,hi'),'');
});

test('share boundary retains decor, strips private root, item and nested metadata without mutating a room', () => {
  const r = new LR.Room(); r.items = [];
  const f = r.add(r.make('minifridge', { x: 0, z: 0, widgets: { secret: 'PRIVATE' } }));
  r.add(r.make('newspaper', { x: 2, z: 2, headlines: [row], widgetState: 'PRIVATE' }));
  r.items.push({ id: 99, t: 'guestnote', note: 'PRIVATE' });
  const d = r.serialize(); d.widgets = { private: 'PRIVATE' }; d.wall.widget = 'PRIVATE'; d.floor.cache = 'PRIVATE';
  const shared = W.shareDecor(d), imported = new LR.Room();
  assert.ok(!JSON.stringify(shared).includes('PRIVATE')); assert.equal(shared.seed, undefined);
  assert.equal(shared.items.length, 2); assert.ok(imported.load(shared));
  assert.equal(imported.get(f.id).t, 'minifridge'); assert.ok(r.get(f.id).widgets);
});

test('phase 2 static content and destinations stay in private storage with no extra fetches', async () => {
  W.register(LR);
  const s = store(), w = W.create({ store: s });
  const types = ['pomodorocandle', ...W.PORTALS.map(p => p.furnitureId)];
  await w.refresh(types);
  for (const id of ['app-portals']) assert.ok(s.values['lr.widgets'][id]);
  assert.equal(W.WIDGETS['tst-corkboard'], undefined);assert.equal(LR.CAT.tstcorkboard, undefined);
  assert.deepEqual(w.destinations('pomodorocandle'), []);
  for (const p of W.PORTALS) assert.ok(w.destinations(p.furnitureId).some(l => l.url === p.url));
  const extra = { furnitureId: 'gamingdesk', label: 'Second app', url: 'https://example.com/second' };
  W.PORTALS.push(extra);
  try { await w.refresh(['gamingdesk']); assert.equal(w.destinations('gamingdesk').length, 1); }
  finally { W.PORTALS.pop(); }
  assert.equal(w.destinations('minifridge').length, 0);
  assert.ok(!LR.CAT.pomodorocandle.focusRitual);
  const m = new LR.Model(); LR.CAT.pomodorocandle.build(m, LR.CAT.pomodorocandle.vars[0]);
  assert.ok(m.parts.portalflame.vox.size > 0);
  const r = new LR.Room(); r.items = [];
  types.forEach((t, i) => r.add(r.make(t, { x: i, z: 0 })));
  const shared = W.shareDecor({ ...r.serialize(), widgets: w.state });
  assert.ok(!JSON.stringify(shared).includes('twostorytails'));
  assert.ok(!JSON.stringify(shared).includes('https:'));
  assert.ok(!JSON.stringify(shared).includes('twice weekly'));
  assert.deepEqual(Object.keys(s.values), ['lr.widgets']);
});
