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
  assert.ok(![...m.parts.head.vox.values()].some(v => v & LR.GLOW)); // plain dude has no robot glow
  const tribute = new LR.Model(); require('../companion.js').definitionFor('automata').build(tribute);
  assert.ok([...tribute.parts.head.vox.values()].some(v => v & LR.GLOW));
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
test('task celebration reuses the hop without adding a speech bubble',()=>{
 const b=createBrain(),e=env();b.step(.1,e);const before=[b.state.message,b.state.bubbleUntil,b.state.category];b.celebrate(e,'task',true);b.step(.1,e);assert.ok(b.state.hop>0);assert.deepEqual([b.state.message,b.state.bubbleUntil,b.state.category],before);
});

test('taking over the companion suspends autonomous routines, including sleep, until released',()=>{
 assert.equal(createBrain().takeControl(env({walk:new Array(100).fill(0)})),false);
 const b=createBrain(),e=env({hour:2,phase:'night'});b.step(.1,e);assert.equal(b.state.mode,'sleep');assert(b.takeControl(e,{x:2.5,z:2.5,heading:0}));assert(b.controlled);
 advance(b,e,20);assert.equal(b.state.x,2.5);assert.equal(b.state.z,2.5);assert.equal(b.state.y,0);assert.equal(b.state.pose,'stand');assert.equal(b.state.mode,'idle');
 b.releaseControl();assert(!b.controlled);b.step(.1,e);assert.equal(b.state.mode,'sleep');
});
test('character movement normalizes diagonals, respects collisions and pauses behind sheets',()=>{
 const e=env(),a=createBrain(),b=createBrain();a.takeControl(e,{x:2.5,z:2.5});b.takeControl(e,{x:2.5,z:2.5});a.move(1,0,0,.1,e);b.move(1,1,0,.1,e);assert(Math.abs(Math.hypot(b.state.x-2.5,b.state.z-2.5)-.16)<1e-8);assert(Math.abs(a.state.z-2.5-.16)<1e-8);
 const blocked=env({walk:new Array(100).fill(1)});for(let x=0;x<10;x++)blocked.walk[3*10+x]=0;const c=createBrain();c.takeControl(blocked,{x:2.5,z:2.5});for(let n=0;n<100;n++){c.move(1,0,0,.1,blocked);c.step(.1,blocked);}assert(c.state.z<2.8);assert(c.state.z>=2.5);
 assert(b.walkTo(e,5,5));const before={x:b.state.x,z:b.state.z};advance(b,{...e,paused:true},5);assert.equal(b.state.x,before.x);assert.equal(b.state.z,before.z);assert(!b.state.moving);
});
test('tap-to-walk routes around furniture and faces a doorway on arrival without room writes',()=>{
 const e=env();e.walk[1*10+2]=0;const before=structuredClone(e),b=createBrain();b.takeControl(e,{x:1.5,z:1.5});assert(!b.walkTo(e,2,1));assert(b.walkTo(e,4,1,Math.PI));
 for(let n=0;n<100;n++){b.step(.1,e);assert(e.walk[Math.floor(b.state.z)*10+Math.floor(b.state.x)]>0);}assert.equal(b.state.x,4.5);assert.equal(b.state.z,1.5);assert.equal(b.state.heading,Math.PI);assert.deepEqual(e,before);
 b.releaseControl();assert(!b.walkTo(e,2,2));assert.equal(b.move(1,0,0,.1,e),false);
});
