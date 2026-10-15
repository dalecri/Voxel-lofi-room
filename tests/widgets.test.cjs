const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../widgets.js');
const LR = require('../room.js');
require('../furniture.js');
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

test('fridge is entirely local; state updates at midnight without touching decor', async () => {
  const s = store(); let d = new Date(2026, 9, 15, 23, 59);
  const w = W.create({ store: s, now: () => d, fetchRSS: () => { throw Error('unexpected network'); } });
  await w.refresh(['minifridge']); const before = w.data('fridge-note');
  d = new Date(2026, 9, 16); await w.refresh(['minifridge']);
  assert.notEqual(before.word, w.data('fridge-note').word);
  assert.deepEqual(Object.keys(s.values), ['lr.widgets']);
});

test('one hourly fetch across widgets, concurrency and reload; last good news survives failure', async () => {
  const s = store(); let time = Date.now(), calls = 0;
  const args = { store: s, now: () => new Date(time), fetchRSS: async url => { assert.equal(url, W.RSS); calls++; return { ok: true, text: async () => 'xml' }; }, parse: () => [row] };
  const w = W.create(args);
  await w.refresh([]); assert.equal(calls, 0);
  await Promise.all(Array.from({ length: 20 }, () => w.refresh(['newspaper', 'newspaper'])));
  assert.equal(calls, 1); assert.deepEqual(w.data('newspaper').headlines, [row]); assert.equal(w.data('newspaper').cached, false);
  await W.create(args).refresh(['newspaper']); assert.equal(calls, 1);
  const failed = W.create({ ...args, fetchRSS: async () => { calls++; throw Error('CORS'); } });
  time += W.HOUR; await failed.refresh(['newspaper']); assert.equal(calls, 2);
  assert.equal(failed.data('newspaper').cached, true); assert.deepEqual(failed.data('newspaper').headlines, [row]);
  const reload = W.create(args); await reload.refresh(['newspaper']); assert.equal(calls, 2);
  time += W.HOUR; await reload.refresh(['newspaper']); assert.equal(calls, 3); assert.equal(reload.data('newspaper').cached, false);
});

test('empty, malformed or HTTP-failed feeds preserve last good headlines; unsafe URLs are rejected', async () => {
  for (const result of ['empty', 'parse', 'http']) {
    const s = store({ 'lr.widgets': { newspaper: { headlines: [row], fetchedAt: 1000, attemptedAt: 1000 } } });
    const w = W.create({ store: s, now: () => new Date(1000 + W.HOUR), fetchRSS: async () => ({ ok: result !== 'http', text: async () => 'bad' }), parse: () => { if (result === 'parse') throw Error('bad XML'); return []; } });
    await w.refresh(['newspaper']); assert.deepEqual(w.data('newspaper').headlines, [row]); assert.equal(w.data('newspaper').cached, true);
  }
  assert.equal(W.articleURL('javascript:alert(1)'), ''); assert.equal(W.articleURL('data:text/html,hi'), '');
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
