// Your Space's private little checklist, sky report and glanceable real-time timers.
(function(root) {
  const KEY='lr.todayTasks';
  const SKY={clear:['☀','Clear skies'],rain:['🌧','Rain at the window'],storm:['⛈','A rumble outside'],snow:['❄','A little snowfall']};
  const PHASE={morning:'Morning',day:'Afternoon',evening:'Evening',night:'Night'};
  // Presentation follows the room's existing phase, including a manually chosen sky.
  function daypart(phase){return {morning:{theme:'morning',greeting:'Good morning',subline:'A fresh page for your day.'},day:{theme:'day',greeting:'Good afternoon',subline:'A little space to pause and tinker.'},evening:{theme:'evening',greeting:'Good evening',subline:'Settle in. There is time for little things.'},night:{theme:'night',greeting:'Good evening',subline:'A quiet corner for the end of your day.'}}[phase] || daypart('day');}
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
  const STARTERS=[
    {id:'supplements',text:'Take daily supplements',icon:'💊'},
    {id:'litter',text:'Scoop cat litter',icon:'🐾'},
    {id:'chore',text:'Daily home chore',icon:'🧹'},
    {id:'workout',text:'Workout',icon:'🏋️'},
    {id:'important',text:'One important thing',icon:'⭐'},
    {id:'tst',text:'TwoStoryTails Post',icon:'🎨'},
  ];
  const taskText=text=>String(text).trim().replace(/\s+/g,' ').slice(0,140);
  const ICONS=['⭐','🌻','🦒','😊','🍃','🌿','🧼','🪥','👟','📞','💧','☕','🥗','🍳','📖','✍️','🧹','🧺','🏋️','🧘','🌙','💊','💻','💬','📚','🌱','🐾','🎨','🎵'];
  const ICON_RULES=[[/\b(wash|shower|bath)\w*/i,'🧼'],[/\b(brush|floss|teeth)\w*/i,'🪥'],[/\b(walk|run|hike)\w*/i,'👟'],[/\b(call|phone)\w*/i,'📞'],[/\b(water|hydrat)\w*/i,'💧'],[/\b(tea|coffee)\w*/i,'☕'],[/\b(cook|bake)\w*/i,'🍳'],[/\b(eat|meal|lunch|breakfast|dinner)\w*/i,'🥗'],[/\b(read|book)\w*/i,'📖'],[/\b(write|journal|letter)\w*/i,'✍️'],[/\b(clean|tidy|sweep|chore)\w*/i,'🧹'],[/\b(laundry|clothes)\w*/i,'🧺'],[/\b(gym|workout|exercise)\w*/i,'🏋️'],[/\b(meditat|breath)\w*/i,'🧘'],[/\b(sleep|rest|bed)\w*/i,'🌙'],[/\b(medic|pill|vitamin|supplement)\w*/i,'💊'],[/\b(work|code|email)\w*/i,'💻'],[/\b(friend|text|message)\w*/i,'💬'],[/\b(study|learn|lesson)\w*/i,'📚'],[/\b(stretch|plant|garden)\w*/i,'🌱'],[/\b(cat|dog|pet)\w*/i,'🐾'],[/\b(draw|paint|art|twostorytails|post)\w*/i,'🎨'],[/\b(music|practi[cs]|sing)\w*/i,'🎵']];
  const iconFor=text=>ICON_RULES.find(([pattern])=>pattern.test(String(text)))?.[1] || '🌿';
  function journey(tasks){const total=tasks.length,checked=tasks.filter(t=>t.done).length,left=total-checked,done=total>0&&left===0,progress=total?checked/total:0;return {total,checked,left,done,progress,stage:progress<.34?'morning':progress<.67?'afternoon':'evening',pose:done?'sleep':'idle',title:done?'All done. Rest now.':total?`${left} little thing${left===1?'':'s'} left!`:'One small thing, whenever you’re ready.'};}
  function create({store,now=()=>Date.now(),onChecked=()=>{},earn=()=>0}) {
    const read=()=>{const data=store.get(KEY,{});return {v:1,next:Number(data?.next)||1,items:(Array.isArray(data?.items)?data.items:[]).filter(t=>t&&typeof t.id==='string'&&typeof t.text==='string').map(t=>({...t,icon:ICONS.includes(t.icon)?t.icon:iconFor(t.text)}))};};
    const write=data=>{store.set(KEY,data);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(data))throw Error('Could not save your list on this device.');};
    return {list:()=>read().items,
      addStarters(ids=STARTERS.map(s=>s.id)){const d=read(),names=new Set(d.items.map(t=>taskText(t.text).toLocaleLowerCase()));let added=0;for(const s of STARTERS){if(!ids.includes(s.id)||names.has(s.text.toLocaleLowerCase())||d.items.length>=50)continue;d.items.push({id:'task-'+d.next++,text:s.text,icon:s.icon,done:false,createdAt:now()});names.add(s.text.toLocaleLowerCase());added++;}if(added)write(d);return added;},
      add(text){text=taskText(text);if(!text)return false;const d=read();if(d.items.length>=50)throw Error('A little breathing room: keep up to 50 things here.');d.items.push({id:'task-'+d.next++,text,icon:iconFor(text),done:false,createdAt:now()});write(d);return true;},
      check(id,on){const d=read(),t=d.items.find(t=>t.id===id);if(t){const newlyDone=!t.done&&!!on;t.done=!!on;write(d);if(newlyDone){const reward=earn('task',t.id);onChecked(t);return Number.isInteger(reward)?reward:0;}}return 0;},
      setIcon(id,icon){if(!ICONS.includes(icon))return false;const d=read(),t=d.items.find(t=>t.id===id);if(!t)return false;t.icon=icon;write(d);return true;},
      remove(id){const d=read();d.items=d.items.filter(t=>t.id!==id);write(d);},
    };
  }
  function timers({tea,focus=[],now=Date.now()}) {
    const rows=[];
    if(tea?.status==='brewing'||tea?.status==='ready')rows.push({id:'tea',icon:'🫖',title:'Tea',value:tea.status==='ready'||tea.endAt<=now?'Ready':countdown(tea.endAt-now),target:'tea'});
    const garden=focus.find(f=>f.kind==='garden'&&f.active);if(garden)rows.push({id:'garden',icon:'🌱',title:'Focus Garden',value:countdown(garden.remaining),target:'garden',focus:garden});
    return rows;
  }
  function createView({model,context,openTimer,openRitual=()=>{},completeMoment=()=>{},portrait=()=>null,portraitKey=()=>'',celebrate=()=>{},hidden=()=>false,notice=()=>{}}) {
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const mounts=new Set(),badges=el('aside','timer-badges');badges.id='timerBadges';badges.hidden=true;badges.setAttribute('aria-label','Active timers');document.body.appendChild(badges);
    function safe(fn){try{fn();refresh();}catch(e){notice(e.message);}}
    function mount(host,{beforeTasks,greetingHost}={}){
      let greeting,hello,greetingDate,greetingSub,observer;
      if(greetingHost){const heading=greetingHost.querySelector(':scope > h2'),subtitle=heading?.nextElementSibling;greeting=el('div','today-greeting');hello=el('h2');greetingDate=el('p','today-greeting-date');greetingSub=el('p','muted');greeting.append(hello,greetingDate,greetingSub);greetingHost.insertBefore(greeting,subtitle?.nextSibling || null);const sync=()=>{greeting.hidden=host.hidden;};observer=new MutationObserver(sync);observer.observe(host,{attributes:true,attributeFilter:['hidden']});sync();}
      const panel=el('div','space-today'),sky=el('section','today-sky'),art=el('span','today-sky-icon'),copy=el('div','today-sky-copy'),date=el('p','today-date'),clock=el('b','today-clock'),phase=el('p','muted today-sky-phase'),skyTag=el('span','today-sky-tag'),condition=el('p','today-condition'),chance=el('p','today-chance'),drops=el('div','today-drops'),updated=el('small','muted');sky.setAttribute('aria-label','Your sky today');art.setAttribute('aria-hidden','true');drops.setAttribute('aria-hidden','true');
      for(let i=0;i<10;i++)drops.appendChild(el('span','','💧'));
      const scene=el('div','today-sky-scene');scene.setAttribute('aria-hidden','true');scene.append(el('i','scene-sun'),el('i','scene-hill far'),el('i','scene-hill near'));
      const weatherBody=el('div','today-weather');copy.append(date,clock,phase,condition,chance,drops,updated);weatherBody.append(art,copy,skyTag,scene);sky.appendChild(weatherBody);panel.appendChild(sky);
      const duo=el('div','today-duo'),moment=el('section','today-moment'),momentLabel=el('h3','today-card-label',"Today's moment"),momentName=el('b','today-moment-name'),momentHint=el('p','today-moment-hint'),streak=el('span','today-streak'),got=el('button','chipbtn primary today-got','Got it');got.type='button';got.onclick=()=>safe(completeMoment);moment.append(momentLabel,momentName,momentHint,streak,got);duo.appendChild(moment);panel.appendChild(duo);
      const rituals=el('nav','today-rituals');rituals.setAttribute('aria-label','Rituals');const chips={};
      for(const [id,icon,label] of [['tea','🫖','Tea'],['garden','🌱','Focus'],['letter','✉','Letter'],['ideas','💡','Idea']]){const chip=el('button','today-ritual'+(id==='garden'?' today-garden':'')),text=el('span'),status=el('small');chip.type='button';chip.dataset.ritual=id;text.append(el('b','',label),status);const symbol=el('span','ritual-icon',icon);symbol.setAttribute('aria-hidden','true');chip.append(symbol,text);chip.onclick=()=>id==='tea'?openTimer({target:'tea'}):openRitual(id);rituals.appendChild(chip);chips[id]=status;}panel.appendChild(rituals);
      if(beforeTasks)beforeTasks(panel);
      const section=el('section','today-tasks'),header=el('div','task-journey'),title=el('h3','','Little things'),summary=el('p','task-journey-summary'),track=el('div','task-day-path'),dude=el('div','task-journey-dude'),image=el('img'),sleep=el('span','task-journey-zzz','Zzz');
      image.alt='Your little roommate';image.width=84;image.height=84;dude.append(image,sleep);sleep.hidden=true;track.setAttribute('aria-hidden','true');
      for(const [key,label,icon] of [['morning','Morning','☀'],['afternoon','Afternoon','☁'],['evening','Evening','☾']]){const stop=el('span','task-path-stop '+key);stop.append(el('i','',icon),el('small','',label));track.appendChild(stop);}track.appendChild(dude);summary.setAttribute('role','status');header.append(title,summary,track);
      const sub=el('p','muted small','Just yours, on this device. One small thing at a time.'),form=el('form','today-task-form'),input=el('input'),add=el('button','chipbtn primary','＋ Add');input.type='text';input.maxLength=140;input.placeholder='A small thing for today…';input.setAttribute('aria-label','A little task');add.type='submit';form.append(input,add);const list=el('div','today-task-list'),empty=el('p','muted task-empty','A blank page is welcome here.'),notebook=el('div','task-notebook'),pageTitle=el('p','task-notebook-title','Your little list');
      const starters=el('details','task-starters'),starterSummary=el('summary'),starterTitle=el('b','','Your daily defaults'),starterCount=el('small','muted'),starterCopy=el('p','muted small','Your daily essentials. Add the ones you want.'),starterList=el('div','task-starter-list'),addAll=el('button','chipbtn task-add-starters');starterSummary.append(starterTitle,starterCount);starters.append(starterSummary,starterCopy,starterList,addAll);starters.open=model.list().length===0;addAll.type='button';
      addAll.onclick=()=>safe(()=>{const n=model.addStarters();if(n)notice(`Added ${n} little thing${n===1?'':'s'}. One at a time.`);});
      const notebookHeading=el('div','task-notebook-heading'),counter=el('span','task-counter'),progress=el('div','task-list-progress'),progressFill=el('span');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Little things completed');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.appendChild(progressFill);notebookHeading.append(pageTitle,counter);notebook.append(notebookHeading,progress,list,empty,starters,form);section.append(notebook,header,sub);panel.appendChild(section);host.appendChild(panel);
      let signature='',lastPortrait='';form.onsubmit=e=>{e.preventDefault();safe(()=>{if(model.add(input.value))input.value='';});input.focus();};
      const entry={panel,destroy(){observer?.disconnect();greeting?.remove();},refresh(){const ctx=context(),w=weather(ctx.meta,ctx.now || new Date()),part=daypart(ctx.meta.phase);sky.dataset.phase=part.theme;if(greeting){hello.textContent=part.greeting+', Cris';greetingDate.textContent=w.date;greetingSub.textContent=part.subline;}art.textContent=w.icon;sky.dataset.sky=ctx.meta.weather || 'clear';date.textContent=w.date;clock.textContent=w.time;phase.textContent=w.phase.split(' · ')[0];skyTag.textContent=w.phase.split(' · ')[1];condition.textContent=w.label+(w.temperature?' · '+w.temperature:'');chance.textContent=w.chance;updated.textContent=w.fetched+(w.stale?' · cached':'');drops.hidden=w.probability===null;[...drops.children].forEach((d,i)=>{d.classList.toggle('wet',i<w.probability/10);d.textContent=ctx.meta.weather==='snow'?'❄':'💧';});
        const daily=ctx.daily;if(daily){momentName.textContent=daily.name;momentHint.textContent=daily.D.done?'Done for today. A new moment tomorrow.':daily.hint;got.disabled=daily.D.done;got.textContent=daily.D.done?'Done for today':'Got it';streak.textContent=ctx.streak?`🔥 ${ctx.streak} day streak`:'A little moment for today';}
        const activeGarden=timers({focus:ctx.focus,now:+(ctx.now || new Date())}).find(t=>t.id==='garden'),tea=timers({tea:ctx.tea,now:+(ctx.now || new Date())})[0];chips.tea.textContent=tea?(tea.value==='Ready'?'ready':`brewing · ${tea.value}`):'ready to brew';chips.garden.textContent=activeGarden?activeGarden.value+' · Back to garden':'15 / 25 / 50 min';chips.letter.textContent=ctx.letterDraft?'draft':'a fresh page';chips.ideas.textContent=ctx.ideaCount?`${ctx.ideaCount} spark${ctx.ideaCount===1?'':'s'}`:'drop a spark';
        const tasks=model.list(),j=journey(tasks),key=JSON.stringify(tasks.map(t=>[t.id,t.text,t.icon]));counter.textContent=`${j.checked} of ${j.total}`;progressFill.style.width=(j.progress*100)+'%';progress.setAttribute('aria-valuenow',String(Math.round(j.progress*100)));empty.hidden=tasks.length>0;if(summary.textContent!==j.title)summary.textContent=j.title;header.dataset.stage=j.stage;header.dataset.pose=j.pose;header.dataset.remaining=String(j.left);track.style.setProperty('--task-progress',String(j.progress));sleep.hidden=!j.done;
        const pk=portraitKey()+':'+j.pose;if(pk!==lastPortrait){lastPortrait=pk;const src=portrait(j.pose);image.hidden=!src;if(src)image.src=src;}
        if(signature!==key){signature=key;list.replaceChildren();for(const t of tasks){
          const row=el('div','today-task'),icon=el('button','today-task-icon',t.icon),copy=el('div','today-task-copy'),text=el('span','today-task-text',t.text),remove=el('button','today-task-remove','Remove'),check=el('button','today-task-check'),mark=el('span','task-checkmark'),reward=el('span','task-check-reward'),picker=el('div','today-icon-picker');
          icon.type='button';icon.setAttribute('aria-label','Icon for task: '+t.text);icon.setAttribute('aria-expanded','false');picker.hidden=true;picker.setAttribute('role','group');picker.setAttribute('aria-label','Choose a task icon');
          icon.onclick=()=>{picker.hidden=!picker.hidden;icon.setAttribute('aria-expanded',String(!picker.hidden));};
          for(const emoji of ICONS){const choice=el('button','',emoji);choice.type='button';choice.setAttribute('aria-label','Use '+emoji);choice.setAttribute('aria-pressed',String(t.icon===emoji));choice.onclick=()=>safe(()=>{model.setIcon(t.id,emoji);entry.refresh();list.querySelector('[data-task="'+t.id+'"] .today-task-icon')?.focus();});picker.appendChild(choice);}
          mark.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12l4 4L19 6"/></svg>';
          check.type='button';check.setAttribute('role','checkbox');check.setAttribute('aria-label',t.text);check.append(mark,reward);mark.setAttribute('aria-hidden','true');reward.setAttribute('aria-hidden','true');
          check.onclick=()=>safe(()=>{const on=check.getAttribute('aria-checked')!=='true',earned=model.check(t.id,on);if(on){celebrate(t);check.classList.remove('celebrating');void check.offsetWidth;check.classList.add('celebrating');setTimeout(()=>check.classList.remove('celebrating'),700);dude.classList.remove('task-hop');void dude.offsetWidth;dude.classList.add('task-hop');if(earned){reward.textContent='+'+earned;check.classList.add('rewarding');setTimeout(()=>{check.classList.remove('rewarding');reward.textContent='';},1300);}}});
          remove.type='button';remove.setAttribute('aria-label','Remove task: '+t.text);remove.onclick=()=>safe(()=>{model.remove(t.id);input.focus();});copy.append(text,remove);row.dataset.task=t.id;row.append(icon,copy,check,picker);list.appendChild(row);
        }}
        const names=new Set(tasks.map(t=>taskText(t.text).toLocaleLowerCase())),suggestions=STARTERS.filter(s=>!names.has(s.text.toLocaleLowerCase())),space=Math.max(0,50-tasks.length);
        const sk=JSON.stringify([suggestions.map(s=>s.id),space]);if(starters.dataset.items!==sk){starters.dataset.items=sk;starterList.replaceChildren();starters.hidden=!suggestions.length;starterCount.textContent=`${suggestions.length} daily essentials`;
          for(const s of suggestions){const b=el('button','task-starter'),icon=el('span','',s.icon),text=el('span','',s.text),plus=el('span','task-starter-plus','＋');b.type='button';b.disabled=!space;b.setAttribute('aria-label','Add '+s.text);icon.setAttribute('aria-hidden','true');plus.setAttribute('aria-hidden','true');b.append(icon,text,plus);b.onclick=()=>safe(()=>{model.addStarters([s.id]);});starterList.appendChild(b);}
          addAll.disabled=!space;addAll.textContent=space?`Add ${Math.min(space,suggestions.length)} little thing${Math.min(space,suggestions.length)===1?'':'s'}`:'Your page has 50 little things';
        }
        const byId=new Map(tasks.map(t=>[t.id,t]));for(const row of list.children){const t=byId.get(row.dataset.task);row.querySelector('.today-task-check').setAttribute('aria-checked',String(!!t.done));row.classList.toggle('done',!!t.done);}
      }};mounts.add(entry);entry.refresh();return panel;
    }
    let next=0;
    function refresh(){for(const m of mounts){if(!m.panel.isConnected){m.destroy();mounts.delete(m);}else m.refresh();}
      const ctx=context(),rows=timers({tea:ctx.tea,focus:ctx.focus,now:+(ctx.now || new Date())});badges.hidden=hidden()||!rows.length;document.body.classList.toggle('has-timers',!badges.hidden);dock();
      const keys=rows.map(r=>r.id).join();if(badges.dataset.keys!==keys){badges.dataset.keys=keys;badges.replaceChildren();for(const row of rows){const b=el('button','timer-badge');b.type='button';b.dataset.timer=row.id;b.append(el('span','timer-icon',row.icon),el('b'),el('span','timer-value'));badges.appendChild(b);}}
      for(const row of rows){const b=[...badges.children].find(b=>b.dataset.timer===row.id);b.querySelector('b').textContent=row.title;b.querySelector('.timer-value').textContent=row.value;b.setAttribute('aria-label',row.title+' · '+row.value+' · Open timer');b.onclick=()=>openTimer(row);}
    }
    // Keep the glance dock on the left, above whichever bottom controls are visible.
    function dock(){if(badges.hidden)return;let bottom=90;for(const node of document.querySelectorAll('.explorebar,.tools,#tray,#catbar')){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)<.1)continue;const r=node.getBoundingClientRect();if(r.width&&r.height&&r.top<innerHeight&&r.right>14&&r.left<innerWidth-90)bottom=Math.max(bottom,innerHeight-r.top+12);}badges.style.setProperty('--timer-dock',bottom+'px');}
    function viewport(){const v=window.visualViewport;badges.style.setProperty('--timer-keyboard',Math.max(0,v?innerHeight-v.height-v.offsetTop:0)+'px');dock();}
    window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();document.addEventListener('visibilitychange',refresh);window.addEventListener('resize',viewport);
    const dockResize=new ResizeObserver(dock);document.querySelectorAll('.explorebar,.tools,#tray,#catbar').forEach(n=>dockResize.observe(n));
    return {mount,refresh,badges,tick(time){if(time<next)return;next=time+1000;refresh();}};
  }
  const api={KEY,SKY,daypart,STARTERS,ICONS,iconFor,journey,weather,countdown,timers,create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRToday=api;
})(typeof window!=='undefined'?window:globalThis);
