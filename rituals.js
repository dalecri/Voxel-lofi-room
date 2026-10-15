// Small rituals use real elapsed time, independent of frame rate and room saves.
(function (root) {
  const FOCUS = 25 * 60000, BREATH = 10 * 60000;
  function create({ store, now = Date.now }) {
    const candles = store.get('lr.focusRituals', {});
    let breathing = null;
    const key = (room, id) => `${room}:${id}`;
    function focus(room, id) {
      const c = candles[key(room, id)];
      if (!c) return { active: false, remaining: FOCUS, fraction: 1, gutter: false };
      const remaining = c.finished ? 0 : c.cancelled ? c.left : Math.max(0, Math.min(FOCUS, c.end - now()));
      const active = !c.finished && !c.cancelled && remaining > 0;
      return { active, remaining, fraction: remaining / FOCUS, gutter: active && remaining <= 30000 };
    }
    function light(room, id) {
      if (focus(room, id).active) return false;
      candles[key(room, id)] = { room, id, start: now(), end: now() + FOCUS };
      store.set('lr.focusRituals', candles); return true;
    }
    function snuff(room, id) {
      const c = candles[key(room, id)];
      if (!c || c.finished || c.cancelled) return false;
      c.left = Math.max(0, Math.min(FOCUS, c.end - now())); c.cancelled = true; store.set('lr.focusRituals', candles); return true;
    }
    function breath() {
      if (!breathing) return { active: false, remaining: 0, level: 0, phase: '' };
      const elapsed = Math.max(0, now() - breathing.start), remaining = Math.max(0, BREATH - elapsed);
      const cycle = elapsed % 10000, inhale = cycle < 4000;
      const progress = inhale ? cycle / 4000 : (cycle - 4000) / 6000;
      const ease = (1 - Math.cos(Math.PI * progress)) / 2;
      return { active: remaining > 0, remaining, level: inhale ? ease : 1 - ease, phase: inhale ? 'Breathe in' : 'Breathe out' };
    }
    function tick() {
      const finished = [];
      for (const c of Object.values(candles)) {
        if (!c.finished && !c.cancelled && c.end <= now()) { c.finished = true; finished.push({ room: c.room, id: c.id }); }
      }
      if (finished.length) store.set('lr.focusRituals', candles);
      const breathFinished = !!breathing && now() - breathing.start >= BREATH;
      if (breathFinished) breathing = null;
      return { finished, breathFinished };
    }
    return { focus, light, snuff, tick, startBreathing() { breathing = { start: now() }; }, stopBreathing() { breathing = null; }, get breath() { return breath(); } };
  }
  function register(L) {
    L.def('focuscandle', {
      name: 'Focus ritual candle', kind: 'small', group: 'lights', size: [1, 1], tap: 'focus', focusRitual: true, on: false, anim: 'flame',
      light: { at: [4, 16, 4], color: 0xffc889, i: 1.7, d: 4, flicker: true },
      vars: [[0xe8d8c4], [0xb8cad8], [0xd7bec9]],
      build(m, [wax], s) {
        m.box(1, 0, 1, 7, 1, 7, 0x8d735b).box(2, 1, 2, 6, 2, 6, 0xc3a678);
        m.part('wax', [4, 2, 4]); m.box(2, 2, 2, 6, 15, 6, wax).box(3, 15, 3, 5, 16, 5, L.shade(wax, 0.9));
        m.part('focusflame', [4, 16, 4]); m.box(3, 16, 3, 5, 17, 5, 0x493a32);
        if (s.on) m.box(3, 17, 3, 5, 19, 5, 0xffbd72, true).set(4, 19, 4, 0xffebbe, true);
        m.main();
      },
    });
  }
  const api = { create, register, FOCUS, BREATH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LRRituals = api; register(root.LR); }
})(typeof window !== 'undefined' ? window : globalThis);
