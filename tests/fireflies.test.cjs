const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create, catalog } = require('../shop.js');

function fixture(initial = {}) {
  const db = new Map(Object.entries(initial));
  let date = '2026-10-15';
  const notices = [];
  const store = { get: (k, d) => db.has(k) ? structuredClone(db.get(k)) : d, set: (k, v) => db.set(k, structuredClone(v)) };
  const reload = () => create({ store, today: () => date, notify: n => notices.push(n) });
  return { db, notices, reload, tomorrow() { date = '2026-10-16'; }, wallet: reload() };
}

test('welcome purse is granted once; zero balance survives reload', () => {
  const f = fixture();
  assert.equal(f.wallet.balance, 30);
  assert.equal(f.reload().balance, 30);
  assert.equal(fixture({ 'lr.fireflies': 0 }).wallet.balance, 0);
});

test('each earning source, per-plant daily credit, and persistent daily cap', () => {
  const f = fixture(), w = f.wallet;
  assert.equal(w.earn('moment'), 5);
  assert.equal(w.earn('daily'), 15);
  assert.equal(w.earn('water', 'room:1'), 2);
  assert.equal(w.earn('water', 'room:1'), 0);
  assert.equal(f.reload().earn('water', 'room:1'), 0);
  for (let n = 0; n < 5; n++) w.earn('moment');
  assert.equal(w.earnedToday, 47);
  assert.equal(w.earn('daily'), 3);
  assert.equal(w.earn('moment'), 0);
  assert.equal(w.balance, 80);
  assert.equal(f.reload().earn('water', 'room:2'), 0);
  assert.equal(w.earn('streak'), 25); // celebration stays whole even after the allowance
  assert.equal(w.balance, 105);
  assert.equal(w.earnedToday, 50);
  assert.equal(f.reload().balance, 105);
  assert.deepEqual(f.notices, [5, 15, 2, 5, 5, 5, 5, 5, 3, 25]);
});

test('new local day resets allowance and watering eligibility, not balance', () => {
  const f = fixture();
  f.wallet.earn('water', 'room:1');
  for (let i = 0; i < 10; i++) f.wallet.earn('moment');
  f.tomorrow();
  assert.equal(f.wallet.earnedToday, 0);
  assert.equal(f.wallet.earn('water', 'room:1'), 2);
  assert.equal(f.wallet.balance, 82);
});

test('purchases are affordable, permanent, and cannot be charged twice', () => {
  const f = fixture(), w = f.wallet;
  assert.equal(w.buy('ufo'), false);
  assert.equal(w.buy('unknown'), false);
  assert.equal(w.available({ shop: 'crown' }), false);
  assert.equal(w.available({}), true); // all existing pieces are free
  w.earn('moment'); w.earn('moment');
  assert.equal(w.buy('crown'), true);
  assert.equal(w.balance, 0);
  assert.equal(w.buy('crown'), false);
  const restored = f.reload();
  assert.equal(restored.balance, 0);
  assert.equal(restored.owns('crown'), true);
  assert.equal(restored.available({ shop: 'crown' }), true);
  assert.deepEqual(f.db.get('lr.shopOwned'), ['crown']);
});

test('the fixed cosmetic catalog has unique ids and prices in range', () => {
  assert.equal(catalog.length, 36);
  assert.equal(new Set(catalog.map(c => c.id)).size, catalog.length);
  assert.ok(catalog.every(c => c.price >= 40 && c.price <= 200 && (c.piece || c.wall || c.floor || c.costume)));
});
test('legacy daily ledgers gain task IDs without losing the existing allowance or watered plants',()=>{
 const f=fixture({'lr.fireflyDay':{date:'2026-10-15',earned:49,watered:['room:1']}}),w=f.wallet;
 assert.equal(w.earn('task','task-1'),1);assert.equal(w.earn('task','task-1'),0);assert.equal(w.earn('water','room:1'),0);assert.equal(w.earnedToday,50);assert.deepEqual(f.db.get('lr.fireflyDay').taskIds,['task-1']);assert.deepEqual(f.db.get('lr.fireflyDay').watered,['room:1']);assert.equal(f.reload().balance,31);
});

test('project spending requires an affordable positive whole amount and persists the debit',()=>{
 const f=fixture();for(const n of [0,-1,1.5,NaN,Infinity,31,'5'])assert.equal(f.wallet.spend(n),false);
 assert.equal(f.wallet.balance,30);assert(f.wallet.spend(10));assert.equal(f.reload().balance,20);
 assert(f.wallet.spend(20));assert.equal(f.reload().balance,0);assert(!f.wallet.spend(1));
});
