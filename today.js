// Your Space's private little checklist, sky report and glanceable real-time timers.
(function(root) {
  const KEY='lr.todayTasks';
  const SKY={clear:['☀','Clear skies'],rain:['🌧','Rain at the window'],storm:['⛈','A rumble outside'],snow:['❄','A little snowfall']};
  const PHASE={morning:'Morning',day:'Afternoon',evening:'Evening',night:'Night'};
  const countdown=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
  function weather(meta,now=new Date()) {
    const [icon,label]=SKY[meta.weather] || SKY.clear,d=meta.liveWeather?meta.weatherDetails:null;
    const probability=Number.isFinite(d?.probability)?Math.max(0,Math.min(100,d.probability)):null;
    const stale=!!d&&(+now-(meta.weatherFetchedAt || 0)>3600000 || probability!==null&&(!Number.isFinite(d.probabilityAt) || +now<d.probabilityAt || +now>=d.probabilityAt+3600000));
    const wet=meta.weather==='snow'?'snow':meta.weather==='clear'?'precipitation':'rain';
    return {icon:meta.weather==='clear'&&meta.phase==='night'?'☾':icon,label,
      date:now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}),time:now.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}),
      phase:`${PHASE[meta.phase] || 'Afternoon'} sky · ${meta.realtime?'following the clock':'chosen by you'}`,
      temperature:Number.isFinite(d?.temperature)?`${Math.round(d.temperature)}°C`:null,probability,stale,
      chance:probability===null?(meta.liveWeather?'The forecast is taking a little rest.':'Your chosen sky. Live forecasts are in Settings.'):
        stale?`Last forecast · ${probability}% chance of ${wet}`:probability===0?`No ${wet} expected this hour.`:`${wet==='snow'?'Snowflakes':wet==='rain'?'Raindrops':'Drops or flakes'} might visit · ${probability}% this hour`,
      fetched:d&&meta.weatherFetchedAt?`Updated ${new Date(meta.weatherFetchedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`:''};
  }
  function create({store,now=()=>Date.now(),onChecked=()=>{}}) {
    const read=()=>{const data=store.get(KEY,{});return {v:1,next:Number(data?.next)||1,items:(Array.isArray(data?.items)?data.items:[]).filter(t=>t&&typeof t.id==='string'&&typeof t.text==='string').map(t=>({...t}))};};
    const write=data=>{store.set(KEY,data);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(data))throw Error('Could not save your list on this device.');};
    return {list:()=>read().items,
      add(text){text=String(text).trim().replace(/\s+/g,' ').slice(0,140);if(!text)return false;const d=read();if(d.items.length>=50)throw Error('A little breathing room: keep up to 50 things here.');d.items.push({id:'task-'+d.next++,text,done:false,createdAt:now()});write(d);return true;},
      check(id,on){const d=read(),t=d.items.find(t=>t.id===id);if(t){const newlyDone=!t.done&&!!on;t.done=!!on;write(d);if(newlyDone)onChecked(t);}},
      remove(id){const d=read();d.items=d.items.filter(t=>t.id!==id);write(d);},
    };
  }
  function timers({tea,focus=[],now=Date.now()}) {
    const rows=[];
    if(tea?.status==='brewing'||tea?.status==='ready')rows.push({id:'tea',icon:'🫖',title:'Tea',value:tea.status==='ready'||tea.endAt<=now?'Ready':countdown(tea.endAt-now),target:'tea'});
    const active=focus.filter(c=>c.active&&c.remaining>0);
    if(active.length)rows.push({id:'focus',icon:'🕯',title:'Focus',value:countdown(active[0].remaining)+(active.length>1?` +${active.length-1}`:''),target:'focus',focus:active[0]});
    return rows;
  }
  function createView({model,context,settings,openTimer,hidden=()=>false,notice=()=>{}}) {
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const mounts=new Set(),badges=el('aside','timer-badges');badges.id='timerBadges';badges.hidden=true;badges.setAttribute('aria-label','Active timers');document.body.appendChild(badges);
    function safe(fn){try{fn();refresh();}catch(e){notice(e.message);}}
    function mount(host,{beforeTasks}={}){
      const panel=el('div','space-today'),sky=el('section','today-sky'),art=el('span','today-sky-icon'),copy=el('div','today-sky-copy'),date=el('p','today-date'),clock=el('b','today-clock'),phase=el('p','muted'),condition=el('p','today-condition'),chance=el('p','today-chance'),drops=el('div','today-drops'),updated=el('small','muted');sky.setAttribute('aria-label','Your sky today');art.setAttribute('aria-hidden','true');drops.setAttribute('aria-hidden','true');
      for(let i=0;i<10;i++)drops.appendChild(el('span','','💧'));
      const config=el('button','chipbtn','Weather settings');config.type='button';config.onclick=settings;copy.append(date,clock,phase,condition,chance,drops,updated,config);sky.append(art,copy);panel.appendChild(sky);
      if(beforeTasks)beforeTasks(panel);
      const section=el('section','today-tasks'),title=el('h3','','Little things'),sub=el('p','muted small','Just yours, on this device. One small thing at a time.'),form=el('form','today-task-form'),input=el('input'),add=el('button','chipbtn primary','＋ Add');input.type='text';input.maxLength=140;input.placeholder='A small thing for today…';input.setAttribute('aria-label','A little task');add.type='submit';form.append(input,add);const list=el('div','today-task-list'),empty=el('p','muted','Nothing tugging at your sleeve.');section.append(title,sub,form,list,empty);panel.appendChild(section);host.appendChild(panel);
      let signature='';form.onsubmit=e=>{e.preventDefault();safe(()=>{if(model.add(input.value))input.value='';});input.focus();};
      const entry={panel,refresh(){const ctx=context(),w=weather(ctx.meta,ctx.now || new Date());art.textContent=w.icon;sky.dataset.sky=ctx.meta.weather || 'clear';date.textContent=w.date;clock.textContent=w.time;phase.textContent=w.phase;condition.textContent=w.label+(w.temperature?' · '+w.temperature:'');chance.textContent=w.chance;updated.textContent=w.fetched+(w.stale?' · cached':'');drops.hidden=w.probability===null;[...drops.children].forEach((d,i)=>{d.classList.toggle('wet',i<w.probability/10);d.textContent=ctx.meta.weather==='snow'?'❄':'💧';});
        const tasks=model.list(),key=JSON.stringify(tasks.map(t=>[t.id,t.text]));empty.hidden=tasks.length>0;
        if(signature!==key){signature=key;list.replaceChildren();for(const t of tasks){const row=el('div','today-task'),label=el('label'),check=el('input'),text=el('span','',t.text),remove=el('button','today-task-remove','×');check.type='checkbox';check.setAttribute('aria-label',t.text);check.onchange=()=>safe(()=>model.check(t.id,check.checked));label.append(check,text);remove.type='button';remove.setAttribute('aria-label','Remove task: '+t.text);remove.onclick=()=>safe(()=>{model.remove(t.id);input.focus();});row.dataset.task=t.id;row.append(label,remove);list.appendChild(row);}}
        const byId=new Map(tasks.map(t=>[t.id,t]));for(const row of list.children){const t=byId.get(row.dataset.task);row.querySelector('input').checked=!!t.done;row.classList.toggle('done',!!t.done);}
      }};mounts.add(entry);entry.refresh();return panel;
    }
    let next=0;
    function refresh(){for(const m of mounts){if(!m.panel.isConnected)mounts.delete(m);else m.refresh();}
      const ctx=context(),rows=timers({tea:ctx.tea,focus:ctx.focus,now:+(ctx.now || new Date())});badges.hidden=hidden()||!rows.length;document.body.classList.toggle('has-timers',!badges.hidden);
      const keys=rows.map(r=>r.id).join();if(badges.dataset.keys!==keys){badges.dataset.keys=keys;badges.replaceChildren();for(const row of rows){const b=el('button','timer-badge');b.type='button';b.dataset.timer=row.id;b.append(el('span','timer-icon',row.icon),el('b'),el('span','timer-value'));badges.appendChild(b);}}
      for(const row of rows){const b=[...badges.children].find(b=>b.dataset.timer===row.id);b.querySelector('b').textContent=row.title;b.querySelector('.timer-value').textContent=row.value;b.setAttribute('aria-label',row.title+' · '+row.value+' · Open timer');b.onclick=()=>openTimer(row);}
    }
    function viewport(){const v=window.visualViewport;badges.style.setProperty('--timer-keyboard',Math.max(0,v?innerHeight-v.height-v.offsetTop:0)+'px');}
    window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();document.addEventListener('visibilitychange',refresh);
    return {mount,refresh,badges,tick(time){if(time<next)return;next=time+1000;refresh();}};
  }
  const api={KEY,SKY,weather,countdown,timers,create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRToday=api;
})(typeof window!=='undefined'?window:globalThis);
