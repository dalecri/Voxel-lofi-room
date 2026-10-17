// Breathing uses real elapsed time, independent of frame rate and room saves.
(function (root) {
  const BREATH = 10 * 60000;
  function create({ store, now = Date.now }) {
    // Retire saved focus timers silently. Placed candles migrate in Room.load.
    store.del?.('lr.focusRituals');
    if (store.get('lr.appShortcut', null) === 'focus') store.del?.('lr.appShortcut');
    let breathing = null;
    function breath() {
      if (!breathing) return { active: false, remaining: 0, level: 0, phase: '' };
      const elapsed = Math.max(0, now() - breathing.start), remaining = Math.max(0, BREATH - elapsed);
      const cycle = elapsed % 10000, inhale = cycle < 4000;
      const progress = inhale ? cycle / 4000 : (cycle - 4000) / 6000;
      const ease = (1 - Math.cos(Math.PI * progress)) / 2;
      return { active: remaining > 0, remaining, level: inhale ? ease : 1 - ease, phase: inhale ? 'Breathe in' : 'Breathe out' };
    }
    function tick() {
      const breathFinished = !!breathing && now() - breathing.start >= BREATH;
      if (breathFinished) breathing = null;
      return { breathFinished };
    }
    return { tick, startBreathing() { breathing = { start: now() }; }, stopBreathing() { breathing = null; }, get breath() { return breath(); } };
  }
  const api = { create, BREATH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRRituals = api;
})(typeof window !== 'undefined' ? window : globalThis);
