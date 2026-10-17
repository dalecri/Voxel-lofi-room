const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create, BREATH } = require('../rituals.js');

function fixture() {
  const db = new Map(); let time = 100000;
  const store = { get: (k, d) => db.has(k) ? structuredClone(db.get(k)) : d, set: (k, v) => db.set(k, structuredClone(v)), del: k => db.delete(k) };
  return { reload: () => create({ store, now: () => time }), advance(ms) { time += ms; }, db };
}

test('retired focus timers and shortcuts clear silently; legacy candle placements become ordinary candles', () => {
  const f=fixture();f.db.set('lr.focusRituals',{'1:2':{end:9999999}});f.db.set('lr.appShortcut','focus');
  const r=f.reload();assert.equal(f.db.has('lr.focusRituals'),false);assert.equal(f.db.has('lr.appShortcut'),false);assert.equal(r.light,undefined);assert.deepEqual(r.tick(),{breathFinished:false});
  const LR=require('../room.js'),room=new LR.Room();assert.equal(LR.CAT.focuscandle,undefined);
  assert.ok(room.load({v:1,items:[{id:2,t:'focuscandle',x:2,z:3,on:true,c:1}]}));
  assert.equal(room.items[0].t,'candle');assert.equal(room.items[0].id,2);assert.equal(room.items[0].x,2);assert.equal(room.items[0].z,3);assert.equal(room.items[0].on,true);assert.ok(!LR.CAT.candle.focusRitual);
});

test('breathing follows four seconds in, six out, with smooth shared visual/audio level', () => {
  const f = fixture(), r = f.reload(); r.startBreathing();
  assert.equal(r.breath.phase, 'Breathe in'); assert.equal(r.breath.level, 0);
  f.advance(2000); assert.ok(Math.abs(r.breath.level - .5) < 1e-8);
  f.advance(2000); assert.equal(r.breath.phase, 'Breathe out'); assert.equal(r.breath.level, 1);
  f.advance(3000); assert.ok(Math.abs(r.breath.level - .5) < 1e-8);
  f.advance(3000); assert.equal(r.breath.phase, 'Breathe in'); assert.equal(r.breath.level, 0);
});

test('breathing ends at ten minutes, handles background elapsed time, and cancels silently', () => {
  const f = fixture(), r = f.reload(); r.startBreathing();
  f.advance(BREATH - 1); assert.equal(r.breath.active, true);
  f.advance(1); assert.equal(r.tick().breathFinished, true);
  assert.equal(r.tick().breathFinished, false);
  assert.equal(r.breath.active, false);
  r.startBreathing(); r.stopBreathing(); f.advance(BREATH);
  assert.equal(r.tick().breathFinished, false);
  // Reload returns to the ordinary room and never autoplays a guided session.
  r.startBreathing(); assert.equal(f.reload().breath.active, false);
});
