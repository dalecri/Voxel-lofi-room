// Real elapsed-time rituals. Only garden sessions use focus timers; the candle stays retired.
(function (root) {
  const BREATH = 10 * 60000;
  function create({ store, now = Date.now }) {
    // Discard retired candle timers, while keeping reloadable garden deadlines.
    const saved=store.get('lr.focusRituals',{}),timers=Object.fromEntries(Object.entries(saved || {}).filter(([,t])=>t?.kind==='garden'&&Number.isFinite(t.start)&&Number.isFinite(t.end)&&t.end>t.start));
    if(Object.keys(timers).length)store.set('lr.focusRituals',timers);else store.del?.('lr.focusRituals');
    if (store.get('lr.appShortcut', null) === 'focus') store.del?.('lr.appShortcut');
    let breathing = null;
    const key=(room,id)=>`${room}:${id}`,persist=()=>store.set('lr.focusRituals',timers);
    function focus(room,id){const t=timers[key(room,id)];if(!t)return null;const remaining=Math.max(0,t.end-now()),progress=Math.max(0,Math.min(1,(now()-t.start)/(t.end-t.start)));return {...t,remaining,progress,active:!t.finished&&!t.cancelled&&remaining>0};}
    function light(room,id,{minutes=25,kind='garden',session}={}){if(kind!=='garden'||![15,25,50].includes(minutes)||Object.values(timers).some(t=>!t.finished&&!t.cancelled&&t.end>now()))return false;const t={room,id,kind,session,minutes,start:now(),end:now()+minutes*60000};timers[key(room,id)]=t;persist();return focus(room,id);}
    function snuff(room,id){const t=timers[key(room,id)];if(!t||t.finished||t.cancelled||t.end<=now())return false;t.cancelled=true;persist();return true;}

    function breath() {
      if (!breathing) return { active: false, remaining: 0, level: 0, phase: '' };
      const elapsed = Math.max(0, now() - breathing.start), remaining = Math.max(0, BREATH - elapsed);
      const cycle = elapsed % 10000, inhale = cycle < 4000;
      const progress = inhale ? cycle / 4000 : (cycle - 4000) / 6000;
      const ease = (1 - Math.cos(Math.PI * progress)) / 2;
      return { active: remaining > 0, remaining, level: inhale ? ease : 1 - ease, phase: inhale ? 'Breathe in' : 'Breathe out' };
    }
    function tick() {
      let changed=false;for(const t of Object.values(timers))if(!t.finished&&!t.cancelled&&t.end<=now()){t.finished=true;changed=true;}if(changed)persist();
      const breathFinished = !!breathing && now() - breathing.start >= BREATH;
      if (breathFinished) breathing = null;
      return { breathFinished };
    }
    return { focus,light,snuff,tick,get activeFocus(){return Object.values(timers).map(t=>focus(t.room,t.id)).filter(t=>t.active).sort((a,b)=>a.end-b.end);}, startBreathing() { breathing = { start: now() }; }, stopBreathing() { breathing = null; }, get breath() { return breath(); } };
  }
  const api = { create, BREATH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRRituals = api;
})(typeof window !== 'undefined' ? window : globalThis);
