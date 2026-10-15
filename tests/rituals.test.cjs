const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create, FOCUS, BREATH } = require('../rituals.js');

function fixture() {
  const db = new Map(); let time = 100000;
  const store = { get: (k, d) => db.has(k) ? structuredClone(db.get(k)) : d, set: (k, v) => db.set(k, structuredClone(v)) };
  return { reload: () => create({ store, now: () => time }), advance(ms) { time += ms; }, db };
}

test('focus burns for exactly 25 minutes, gutters near the end and completes only once', () => {
  const f = fixture(), r = f.reload();
  assert.equal(r.focus(1, 2).fraction, 1);
  assert.equal(r.light(1, 2), true);
  assert.equal(r.light(1, 2), false); // tapping a burning candle never resets it
  f.advance(FOCUS / 2);
  assert.equal(r.focus(1, 2).fraction, .5);
  assert.equal(f.reload().focus(1, 2).remaining, FOCUS / 2);
  f.advance(FOCUS / 2 - 30000);
  assert.equal(r.focus(1, 2).gutter, true);
  f.advance(29999); assert.equal(r.focus(1, 2).active, true);
  f.advance(1);
  assert.deepEqual(r.tick().finished, [{ room: 1, id: 2 }]);
  assert.equal(r.focus(1, 2).active, false);
  assert.equal(r.focus(1, 2).fraction, 0);
  assert.deepEqual(r.tick().finished, []);
  assert.deepEqual(f.reload().tick().finished, []);
});

test('snuffing keeps the burned height, survives reload, never chimes, and can restart', () => {
  const f = fixture(), r = f.reload();
  r.light(1, 2); f.advance(FOCUS / 2); r.snuff(1, 2);
  f.advance(FOCUS);
  assert.equal(f.reload().focus(1, 2).fraction, .5);
  assert.equal(f.reload().focus(1, 2).active, false);
  assert.deepEqual(r.tick().finished, []);
  assert.equal(r.light(1, 2), true);
  assert.equal(r.focus(1, 2).fraction, 1);
});

test('focus timing belongs to a candle in a room and completes after time spent away', () => {
  const f = fixture(), r = f.reload();
  r.light(1, 2); f.advance(60000); r.light(2, 2);
  assert.equal(r.focus(3, 2).active, false);
  f.advance(FOCUS);
  assert.equal(f.reload().tick().finished.length, 2);
  assert.equal(f.reload().tick().finished.length, 0);
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
