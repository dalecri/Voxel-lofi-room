const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function sound(random = 0) {
  const scope = { window: {}, Math: Object.assign(Object.create(Math), { random: () => random }) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../sound.js'), 'utf8'), scope);
  return scope.window.LofiSound;
}
test('every mood, progression and daypart schedules accompaniment without a melody voice', () => {
  for (const random of [0, 0.39, 0.6, 0.99]) {
    const s = sound(random), calls = new Set();
    assert.equal(s.melody, undefined);
    for (const mood of s.moods) assert.ok(!('bells' in mood));
    for (const voice of ['keys', 'bass', 'kick', 'snare', 'hat']) s[voice] = () => calls.add(voice);
    s.bell = s.chime = () => assert.fail('UI chime scheduled by the band');
    for (s.mood = 0; s.mood < s.moods.length; s.mood++) {
      for (s.prog = 0; s.prog < s.moods[s.mood].progs.length; s.prog++) {
        for (s.bar = 0; s.bar < 4; s.bar++) for (s.night of [0, 0.3, 0.6, 1]) {
          for (const dreamy of [false, true]) { s.dreamy = dreamy; for (let step = 0; step < 16; step++) s.playStep(step, 10); }
        }
      }
    }
    assert.ok(calls.has('keys') && calls.has('bass') && calls.has('kick') && calls.has('snare'));
  }
});
test('tram UI bell retains its two dings', () => {
  const s = sound(), calls = []; s.ready = () => true; s.ctx = { currentTime: 10 };
  s.tone = (...args) => calls.push(args); s.bell();
  assert.deepEqual(calls, [[1318.5, 10, .9, .06, 'triangle'], [2637, 10, .5, .02, 'sine'], [1318.5, 10.28, .9, .06, 'triangle'], [2637, 10.28, .5, .02, 'sine']]);
});
