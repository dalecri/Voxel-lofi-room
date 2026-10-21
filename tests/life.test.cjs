const { test } = require('node:test');
const assert = require('node:assert/strict');
const { merchant, journal, ambience } = require('../life.js');
const { catalog } = require('../shop.js');

function fixture() {
  const db = new Map(); let time = 1000000, date = '2026-10-15';
  const store = { get: (k, d) => db.has(k) ? structuredClone(db.get(k)) : d, set: (k, v) => db.set(k, structuredClone(v)) };
  return { db, store, now: () => time, today: () => date, random: () => 0.5,
    advance(ms) { time += ms; }, nextDay() { date = '2026-10-16'; time += 86400000; } };
}

test('merchant waits for play, offers three unique unowned wares and retains them on reload', () => {
  const f = fixture(), setup = () => merchant({ ...f, owns: id => id === 'crown', catalog });
  const m = setup();
  assert.equal(m.tick(1000, false), false);
  assert.equal(m.tick(20, true), false);
  assert.equal(m.tick(100, true), true);
  assert.equal(m.wares.length, 3);
  assert.equal(new Set(m.wares).size, 3);
  assert.ok(!m.wares.includes('crown'));
  assert.deepEqual(setup().wares, m.wares);
  assert.equal(m.offers(m.wares[0]), true);
  assert.equal(m.offers('unknown'), false);
});

test('missed visits return another day, never rerolling on the same day', () => {
  const f = fixture(), m = merchant({ ...f, owns: () => false, catalog });
  m.tick(200, true);
  const first = f.db.get('lr.merchant');
  f.advance(180001);
  assert.equal(m.active, false);
  assert.equal(m.tick(10000, true), false);
  assert.deepEqual(f.db.get('lr.merchant'), first);
  f.nextDay();
  assert.equal(m.tick(200, true), true);
  assert.equal(f.db.get('lr.merchant').date, '2026-10-16');
});

test('cozy rooms welcome the merchant sooner and browsing lets him linger', () => {
  const f = fixture(), m = merchant({ ...f, owns: () => false, catalog });
  assert.equal(m.tick(65, true, 1), true);
  f.advance(160000); m.linger(); f.advance(30000);
  assert.equal(m.active, true);
  f.advance(31000);
  assert.equal(m.active, false);
  const low = fixture();
  assert.equal(merchant({ ...low, owns: () => false, catalog }).tick(65, true, 0), false);
});

test('all-owned collection still has three wares without touching permanent ownership', () => {
  const f = fixture(), m = merchant({ ...f, owns: () => true, catalog });
  m.tick(200, true); assert.equal(m.wares.length, 3);
  assert.equal(new Set(m.wares).size, 3);
});

test('cat journal records actual named events, persists, deduplicates and excludes visitors', () => {
  const f = fixture(), j = journal(f), cat = { id: 1, t: 'cat', c: 0, name: 'Cali' };
  assert.equal(j.write(cat, 'mischief', 7, 'mug'), true);
  assert.match(j.entries[0].text, /mug/);
  assert.equal(j.entries[0].name, 'Cali');
  assert.equal(journal(f).write(cat, 'mischief', 7, 'mug'), false);
  assert.equal(j.write({ ...cat, visitor: true }, 'nap', 7), false);
  assert.equal(j.write({ ...cat, t: 'merchantcat' }, 'nap', 7), false);
  assert.equal(j.write(cat, 'sunbeam', 7), true);
  assert.equal(j.write(cat, 'invented', 7), false);
  f.advance(600001);
  assert.equal(j.write(cat, 'mischief', 7, 'mug'), true);
  for (let k = 0; k < 150; k++) j.write({ ...cat, id: k + 2 }, 'pet', 7);
  assert.equal(j.entries.length, 120);
  assert.equal(journal(f).entries.length, 120);
});

test('ambient events pause during blocked play and butterflies need a clear daytime window', () => {
  const a = ambience({ random: () => 0.99 });
  assert.equal(a.tick(1000, false, {}), null);
  assert.equal(a.tick(10, true, {}), null);
  assert.equal(a.tick(100, true, { window: true, rain: false, day: true }), 'butterfly');
  assert.equal(a.tick(110, true, { window: true, rain: true, day: true }), 'leaves');
  assert.equal(a.tick(110, true, { window: true, rain: false, day: false }), 'leaves');
  assert.equal(ambience({ random: () => 0 }).tick(40, true, {}), 'leaves');
});
test('ambience never sends a train past the room',()=>{
  const {ambience}=require('../life.js');const a=ambience();const seen=new Set();
  for(let i=0;i<400;i++){const k=a.tick(200,true,{window:i%2===0,rain:i%3===0,day:i%4<2});if(k)seen.add(k);}
  assert.ok(!seen.has('train'));assert.ok(seen.has('leaves'));
});
