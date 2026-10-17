// Focus Garden stores labels and outcomes, not a second clock. rituals.js owns
// all deadlines. Care's growth override reads these sessions without water/wilt.
(function(root){
  const KEY='lr.focusGarden',PRESETS=[15,25,50],STAGES=['A mystery seed','A little sprout','Leaves unfolding','A quiet bud','In bloom'];
  const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const stageOf=progress=>Math.min(4,Math.max(0,Math.floor(Math.min(1,Math.max(0,progress))*4)));
  function create({store,rituals,now=Date.now}){
    const old=store.get(KEY,{}) || {};
    let state={sessions:Array.isArray(old.sessions)?old.sessions.filter(s=>s&&typeof s.id==='string'&&PRESETS.includes(s.minutes)).map(s=>({...s})):[],totalBlooms:Math.max(0,Number(old.totalBlooms)||0),blossomsGrown:Math.max(0,Number(old.blossomsGrown)||0)};
    // An interruption between deadline/history writes must not leave an orphan
    // timer blocking a new seed. Intact history always keeps its original end.
    for(const t of rituals.activeFocus)if(!state.sessions.some(s=>s.id===t.session&&s.status==='running'))rituals.snuff(t.room,t.id);
    const persist=()=>{store.set(KEY,state);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(state))throw Error('Could not save your garden on this device.');};
    const copy=s=>s&&({...s});
    function clock(s){const t=rituals.focus(s.room,s.bed);return t?.session===s.id?t:null;}
    function active(){return state.sessions.find(s=>s.status==='running') || null;}
    function tick(){const completed=[];for(const s of state.sessions){if(s.status!=='running')continue;const t=clock(s);if(t&&!t.cancelled&&t.end<=now()){s.status='completed';s.completed=true;state.totalBlooms++;s.blossomDue=state.totalBlooms%4===0;if(s.blossomDue)state.blossomsGrown++;completed.push(copy(s));}}if(completed.length)persist();return completed;}
    function start(room,bed,minutes){tick();if(active())return copy(active());if(!PRESETS.includes(minutes))throw Error('Choose 15, 25, or 50 minutes.');const id='garden-'+now().toString(36)+'-'+state.sessions.length;
      const t=rituals.light(room,bed,{kind:'garden',minutes,session:id});if(!t)throw Error('A seed is already growing. Pick up that session first.');
      const s={id,date:day(new Date(t.start)),room,bed,minutes,start:t.start,end:t.end,completed:false,status:'running',seed:state.sessions.length%3,plant:null,sapling:null};state.sessions.push(s);try{persist();}catch(e){state.sessions.pop();rituals.snuff(room,bed);throw e;}return copy(s);
    }
    function pocket(){tick();const s=active();if(!s)return null;rituals.snuff(s.room,s.bed);s.status='pocketed';persist();return copy(s);}
    function growth(room,plant){const s=state.sessions.find(s=>s.room===room&&s.plant===plant&&!s.archived);if(!s)return {stage:4};return {stage:s.completed?4:s.status==='running'?stageOf(clock(s)?.progress || 0):0};}
    function detach(room,id){tick();for(const s of state.sessions)if(s.room===room&&(s.plant===id||s.bed===id)){if(s.status==='running'){rituals.snuff(s.room,s.bed);s.status='pocketed';}s.archived=true;}persist();}
    // Place through the existing room support/footprint model. IDs are bound to
    // private sessions, never added as private metadata to shared decor items.
    function settle(room,roomId,LR){let changed=false,updated=false;
      const free=(type,near)=>{const cells=[];for(let x=0;x<room.n;x++)for(let z=0;z<room.n;z++)cells.push({x,z});cells.sort((a,b)=>Math.hypot(a.x-(near?.x||0),a.z-(near?.z||0))-Math.hypot(b.x-(near?.x||0),b.z-(near?.z||0)));return cells.map(p=>room.make(type,p)).find(it=>room.canPlace(it));};
      for(const s of state.sessions.filter(s=>s.room===roomId)){
        const bed=room.get(s.bed);
        if(s.status==='pocketed'){if(s.plant&&room.get(s.plant)?.t==='focusbloom'){room.remove(s.plant);changed=true;}continue;}
        if(!s.archived&&(!s.plant||!room.get(s.plant))&&bed?.t==='focusgarden'){
          let candidate=[0,1].map(lx=>room.make('focusbloom',{p:bed.id,lx,lz:0,c:s.seed})).find(it=>room.canPlace(it));
          if(!candidate){const old=room.items.find(it=>it.p===bed.id&&it.t==='focusbloom'&&state.sessions.some(a=>a.plant===it.id&&a.completed));if(old){const spot=free('focusbloom',bed);if(spot){delete old.p;delete old.lx;delete old.lz;old.x=spot.x;old.z=spot.z;changed=true;candidate=[0,1].map(lx=>room.make('focusbloom',{p:bed.id,lx,lz:0,c:s.seed})).find(it=>room.canPlace(it));}}}
          if(candidate){const plant=room.add(candidate);s.plant=plant.id;updated=changed=true;}
        }
        if(s.completed&&s.blossomDue&&!s.sapling){const spot=free('focuscherry',bed);if(spot){s.sapling=room.add(spot).id;updated=changed=true;}}
      }
      if(updated)persist();return changed;
    }
    return {start,pocket,tick,growth,settle,detach,ack(id){const s=state.sessions.find(s=>s.id===id);if(s){s.announced=true;persist();}},get active(){const s=active();if(!s)return null;const t=clock(s);return {...s,remaining:t?.remaining || 0,progress:t?.progress || 0,stage:stageOf(t?.progress || 0)};},label(room,plant){return copy(state.sessions.find(s=>s.room===room&&s.plant===plant));},get state(){return JSON.parse(JSON.stringify(state));}};
  }
  function createView({model,sheet,roomId,start,end,preview=()=>null}){
    let bed=null,host=null,selected=25,signature='';
    function open(id){bed=id;sheet('Focus Garden','A seed and a little time. Everything here can wait.',h=>{host=h('div','focus-garden');signature='';draw(true);});}
    function draw(force=false){if(!host?.isConnected||!force&&!host.closest('.sheet.open'))return;const active=model.active,running=!!active,session=running?active:model.state.sessions.filter(s=>s.room===roomId()&&s.bed===bed).at(-1),finished=!running&&session?.completed;
      const key=JSON.stringify([session?.id,running,finished,selected]);if(signature!==key){signature=key;host.replaceChildren();
        const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
        const dial=el('div','garden-dial');dial.innerHTML='<svg viewBox="0 0 240 240" aria-hidden="true"><circle class="tea-dial-track" cx="120" cy="120" r="104"/><circle class="tea-dial-progress" cx="120" cy="120" r="104" transform="rotate(-90 120 120)" stroke-dasharray="653.45"/></svg>';
        const middle=el('div','garden-dial-content'),image=el('img','garden-seedling');image.alt='Mystery seedling';image.width=84;image.height=84;const clock=el('b','garden-clock'),stage=el('span','garden-stage');clock.setAttribute('role','timer');clock.setAttribute('aria-live','off');middle.append(image,clock,stage);dial.appendChild(middle);host.appendChild(dial);
        const presets=el('div','tea-presets');presets.setAttribute('role','group');presets.setAttribute('aria-label','Focus duration');for(const n of PRESETS){const b=el('button','tea-pill',n+' min');b.type='button';b.disabled=running;b.setAttribute('aria-pressed',String((running?active.minutes:selected)===n));b.onclick=()=>{selected=n;signature='';draw();};presets.appendChild(b);}host.appendChild(presets);
        const status=el('p','garden-status');status.setAttribute('role','status');const button=el('button',running?'garden-end':'tea-start',running?'End session':finished?'Plant another seed':'Start');button.type='button';button.onclick=()=>{try{if(running)end();else start(bed,selected);signature='';draw();}catch(e){status.textContent=e.message;}};host.append(button,status);
        if(finished)status.textContent='It burst into bloom';
      }
      const progress=running?active.progress:finished?1:0,stage=stageOf(progress),mins=running?active.minutes:selected,remaining=running?active.remaining:mins*60000;
      host.dataset.state=running?'running':finished?'bloomed':'idle';host.dataset.stage=stage;const arc=host.querySelector('.tea-dial-progress');arc.style.strokeDashoffset=String(653.45*(1-progress));host.querySelector('.garden-clock').textContent=finished?'In bloom':running?`${Math.floor(Math.ceil(remaining/1000)/60)}:${String(Math.ceil(remaining/1000)%60).padStart(2,'0')}`:`${mins} MIN`;
      host.querySelector('.garden-stage').textContent=finished?'Rooted in a little time':STAGES[stage];const image=host.querySelector('img'),src=preview(stage,session?.seed || 0);if(src&&image.getAttribute('src')!==src)image.src=src;
    }
    return {open,refresh:draw};
  }
  const api={KEY,PRESETS,STAGES,stageOf,create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRFocusGarden=api;
})(typeof window!=='undefined'?window:globalThis);
