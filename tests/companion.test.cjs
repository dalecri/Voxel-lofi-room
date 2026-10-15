const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBrain, SPEECH, category, definition, ID } = require('../companion.js');
const LR = require('../room.js');
const env = extra => ({ roomId: 1, n: 10, walk: new Array(100).fill(1), desks: [], windows: [], hour: 14, phase: 'day', weather: 'clear', editing: false, beat: -1, quiet: false, ...extra });
const advance = (b, e, seconds) => { for (let k = 0; k < seconds * 10; k++) b.step(.1, e); return b.state; };

test('lampbot uses voxel primitives without becoming catalog furniture', () => {
  const m = new LR.Model(); definition.build(m);
  assert.equal(ID, 'lampbot'); assert.equal(LR.CAT.lampbot, undefined);
  assert.ok(m.parts.main.vox.size > 0 && m.parts.head.vox.size > 0);
  assert.ok([...m.parts.head.vox.values()].some(v => v & LR.GLOW));
  assert.equal(Object.values(SPEECH).flat().length, 50);
  assert.ok(Object.values(SPEECH).flat().every(line => !line.includes('—')));
});

test('wandering, pauses and head tilts are deterministic and stay on walkable cells', () => {
  const a = createBrain(), b = createBrain(), e = env();
  const old = Math.random; Math.random = () => { throw Error('random companion behavior'); };
  try {
    const start = { ...a.step(.1, e) }; b.step(.1, e);
    let wandered = false, paused = false;
    for (let k = 0; k < 600; k++) {
      a.step(.1, e); b.step(.1, e); assert.deepEqual(a.state, b.state);
      assert.ok(a.state.x >= 0 && a.state.x < 10 && a.state.z >= 0 && a.state.z < 10);
      wandered ||= a.state.x !== start.x || a.state.z !== start.z; paused ||= a.state.mode === 'idle';
    }
    assert.ok(wandered && paused && a.state.tilt !== 0);
  } finally { Math.random = old; }
});

test('edit mode hops to the nearest desk, follows desk height, and leaves when editing ends', () => {
  const b = createBrain(), e = env(); b.step(.1, e);
  e.desks = [{ id: 1, x: 1, z: 1, y: 1.5 }, { id: 2, x: 6, z: 5, y: 1.5 }]; e.editing = true;
  advance(b, e, 2); assert.equal(b.state.perch, 2); assert.equal(b.state.y, 1.5);
  e.desks[1].y = 2.25; advance(b, e, 2); assert.equal(b.state.y, 2.25);
  e.desks[1].x = 7; advance(b, e, 2); assert.equal(b.state.x, 7);
  e.editing = false; advance(b, e, 3); assert.equal(b.state.y, 0); assert.equal(b.state.perch, null);
});

test('rain faces the nearest window, snow has its own speech, and sleep wins after midnight', () => {
  const b = createBrain(), e = env({ weather: 'rain', windows: [{ x: 8, z: 5.5 }, { x: 0, z: 0 }] });
  b.step(.1, e); assert.equal(b.state.mode, 'rain'); assert.equal(b.state.brightness, 1.18);
  assert.equal(b.state.heading, Math.atan2(8 - b.state.x, 5.5 - b.state.z));
  for (const [phase, hour] of [['morning', 8], ['day', 14], ['evening', 19], ['night', 21]]) assert.equal(category(env({ phase, hour }), 'context', 1), phase);
  assert.equal(category(env({ weather: 'snow' }), 'tap', 0), 'snow');
  e.hour = 0; e.editing = true; e.desks = [{ id: 2, x: 3, z: 3, y: 2 }];
  b.step(.1, e); const spot = [b.state.x, b.state.y, b.state.z];
  advance(b, e, 10); assert.equal(b.state.mode, 'sleep'); assert.equal(b.state.pose,'powerdown'); assert.equal(b.state.brightness,.22*1.18);
  assert.deepEqual([b.state.x,b.state.y,b.state.z],spot);
  e.hour = 5; e.editing = false; e.weather = 'clear'; b.step(.1, e); assert.notEqual(b.state.mode, 'sleep');
});

test('beat drives the bop and tap/moment celebrations bypass the speech cooldown', () => {
  const b = createBrain(), e = env({ beat: 0 }); b.step(.1, e); assert.equal(b.state.bob, .065);
  e.beat = .8; b.step(.1, e); assert.ok(b.state.bob < .001);
  assert.equal(b.speak(e, 'idle', false), true); assert.equal(b.speak(e, 'idle', false), false);
  b.tap(e); b.step(.1, e); assert.ok(b.state.hop > 0); assert.ok(b.state.message);
  b.celebrate(e); b.step(.1, e); assert.equal(b.state.category, 'moment');
  advance(b, e, 5); assert.equal(b.state.message, ''); assert.equal(b.state.hop, 0);
  advance(b, e, 41); assert.equal(b.speak(e, 'idle', false), true);
});

test('room changes reset the one state and quiet rituals suppress speech', () => {
  const b = createBrain(), e = env(); b.step(.1, e); b.tap(e);
  e.roomId = 2; e.n = 24; e.walk = new Array(576).fill(1); b.step(.1, e);
  assert.equal(b.state.roomId, 2); assert.equal(b.state.message, ''); assert.ok(b.state.x >= 11);
  e.quiet = true; b.tap(e); b.step(.1, e); assert.equal(b.state.message, '');
});
