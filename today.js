// Your Space's private little checklist, sky report and glanceable real-time timers.
(function(root) {
  const KEY='lr.todayTasks';
  const SKY={clear:['☀','Clear skies'],rain:['🌧','Rain at the window'],storm:['⛈','A rumble outside'],snow:['❄','A little snowfall']};
  const PHASE={morning:'Morning',day:'Afternoon',evening:'Evening',night:'Night'};
  // Presentation follows the room's existing phase, including a manually chosen sky.
  function daypart(phase){return {morning:{theme:'morning',greeting:'Good morning',subline:'A fresh page for your day.'},day:{theme:'day',greeting:'Good afternoon',subline:'A little space to pause and tinker.'},evening:{theme:'evening',greeting:'Good evening',subline:'Settle in. There is time for little things.'},night:{theme:'night',greeting:'Good evening',subline:'A quiet corner for the end of your day.'}}[phase] || daypart('day');}
  // Monday-first local week, including month/year and DST boundaries.
  function weekDays(now=new Date()) {
    const start=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
    start.setDate(start.getDate()-(start.getDay()+6)%7);
    return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return {date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,label:d.toLocaleDateString(undefined,{weekday:'short'}),number:d.getDate(),today:d.toDateString()===now.toDateString()};});
  }
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
  // Forecast dates are civil dates from the existing weather cache, never UTC weekdays.
  function weatherCard(meta,now=new Date()) {
    const current=weather(meta,now),data=meta.liveWeather?meta.weatherDetails:null;
    const rows=Array.from({length:5},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const f=Array.isArray(data?.forecast)?data.forecast.find(f=>f?.date===date&&Number.isFinite(f.low)&&Number.isFinite(f.high)&&SKY[f.condition]):null;
      return {date,day:d.toLocaleDateString(undefined,{weekday:'short'}),condition:f?.condition || null,low:f?Math.round(f.low):null,high:f?Math.round(f.high):null};});
    return {label:current.label,condition:SKY[meta.weather]?meta.weather:'clear',temperature:Number.isFinite(data?.temperature)?Math.round(data.temperature):null,rows,
      note:!meta.liveWeather?'Live weather off':!data?'Forecast unavailable':current.stale?'Cached forecast':'Local weather'};
  }
  const STARTERS=[
    {id:'supplements',text:'Take daily supplements',icon:'💊'},
    {id:'litter',text:'Scoop cat litter',icon:'🐾'},
    {id:'chore',text:'Daily home chore',icon:'🧹'},
    {id:'workout',text:'Workout',icon:'🏋️'},
    {id:'important',text:'One important thing',icon:'⭐'},
  ];
  const taskText=text=>String(text).trim().replace(/\s+/g,' ').slice(0,140);
  const ICONS=['⭐','🌻','🦒','😊','🍃','🌿','🧼','🪥','👟','📞','💧','☕','🥗','🍳','📖','✍️','🧹','🧺','🏋️','🧘','🌙','💊','💻','💬','📚','🌱','🐾','🎨','🎵'];
  const ICON_RULES=[[/\b(wash|shower|bath)\w*/i,'🧼'],[/\b(brush|floss|teeth)\w*/i,'🪥'],[/\b(walk|run|hike)\w*/i,'👟'],[/\b(call|phone)\w*/i,'📞'],[/\b(water|hydrat)\w*/i,'💧'],[/\b(tea|coffee)\w*/i,'☕'],[/\b(cook|bake)\w*/i,'🍳'],[/\b(eat|meal|lunch|breakfast|dinner)\w*/i,'🥗'],[/\b(read|book)\w*/i,'📖'],[/\b(write|journal|letter)\w*/i,'✍️'],[/\b(clean|tidy|sweep|chore)\w*/i,'🧹'],[/\b(laundry|clothes)\w*/i,'🧺'],[/\b(gym|workout|exercise)\w*/i,'🏋️'],[/\b(meditat|breath)\w*/i,'🧘'],[/\b(sleep|rest|bed)\w*/i,'🌙'],[/\b(medic|pill|vitamin|supplement)\w*/i,'💊'],[/\b(work|code|email)\w*/i,'💻'],[/\b(friend|text|message)\w*/i,'💬'],[/\b(study|learn|lesson)\w*/i,'📚'],[/\b(stretch|plant|garden)\w*/i,'🌱'],[/\b(cat|dog|pet)\w*/i,'🐾'],[/\b(draw|paint|art|post)\w*/i,'🎨'],[/\b(music|practi[cs]|sing)\w*/i,'🎵']];
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
  const WIDGET_IDS=['week','feature','tasks','tools','weather'];
  function widgetOrder(value,available=WIDGET_IDS){
    const allowed=[...new Set(available.filter(id=>WIDGET_IDS.includes(id)))];
    return [...new Set([...(Array.isArray(value)?value:[]),...allowed])].filter(id=>allowed.includes(id));
  }
  function createView({model,context,openTimer,openRitual=()=>{},completeMoment=()=>{},portrait=()=>null,portraitKey=()=>'',celebrate=()=>{},hidden=()=>false,notice=()=>{},saveWidgetOrder=()=>{}}) {
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const mounts=new Set(),badges=el('aside','timer-badges');badges.id='timerBadges';badges.hidden=true;badges.setAttribute('aria-label','Active timers');document.body.appendChild(badges);
    function safe(fn){try{fn();refresh();}catch(e){notice(e.message);}}
    function mountWidgets(host,rows){
      const bar=el('div','today-arrange-bar'),done=el('button','chipbtn today-widget-done','Done'),reset=el('button','chipbtn today-widget-reset','Reset order'),status=el('p','today-widget-status');
      done.type=reset.type='button';status.setAttribute('role','status');status.id='today-widget-status-'+(++tabSeq);bar.hidden=status.hidden=true;
      const hint=el('span','today-widget-help','Hold to move this widget. Keyboard: focus the widget and press Space, then use the up and down arrows. Escape finishes arranging.');hint.id=status.id+'-help';
      bar.append(hint,reset,done);const stack=el('div','today-widget-stack');host.append(bar,status,stack);
      const cards=new Map();let arranging=false,drag=null,pending=null,suppressedUntil=0,suppressedCard=null;
      const order=()=>[...stack.children].map(n=>n.dataset.widget);
      function update(){const ids=order();for(const [id,row] of cards){row.up.disabled=ids[0]===id;row.down.disabled=ids.at(-1)===id;}}
      const apply=ids=>{for(const id of widgetOrder(ids,[...cards.keys()]))stack.appendChild(cards.get(id).card);update();};
      const announce=text=>{status.textContent=text;status.hidden=false;};
      function commit(before){
        const ids=order();if(ids.join()===before.join())return true;
        try{saveWidgetOrder(ids);return true;}catch(e){apply(before);announce('Could not save this layout. Your previous order is restored.');notice(e.message);return false;}
      }
      function move(id,delta,focus){
        const before=order(),index=before.indexOf(id),next=index+delta;if(next<0||next>=before.length)return;
        const ids=before.slice();[ids[index],ids[next]]=[ids[next],ids[index]];apply(ids);
        if(commit(before))announce(`${cards.get(id).title} moved to position ${next+1} of ${ids.length}.`);
        (focus?.disabled?cards.get(id).handle:focus)?.focus({preventScroll:true});
      }
      function removeGestureListeners(){
        document.removeEventListener('pointermove',pointerMove,true);document.removeEventListener('pointerup',pointerEnd,true);document.removeEventListener('pointercancel',pointerCancel,true);document.removeEventListener('touchmove',touchMove);
      }
      function cancelPending(){if(pending){clearTimeout(pending.timer);pending=null;}if(!drag)removeGestureListeners();}
      function stopDrag(cancel=false){
        const current=drag;if(!current)return;drag=null;cancelAnimationFrame(current.frame);current.preview.remove();
        current.card.classList.remove('is-dragging');stack.classList.remove('is-dragging');suppressedUntil=performance.now()+500;suppressedCard=current.card;
        if(current.card.hasPointerCapture(current.pointer))current.card.releasePointerCapture(current.pointer);
        removeGestureListeners();
        if(cancel){apply(current.before);announce('Move cancelled.');}
        else if(commit(current.before))announce(`${cards.get(current.id).title} is now position ${order().indexOf(current.id)+1} of ${cards.size}.`);
        update();
      }
      function setArranging(on){
        arranging=on;stack.classList.toggle('is-arranging',on);bar.hidden=status.hidden=!on;
        status.textContent=on?'Drag a widget to move it. Tap Done when finished.':'';
        for(const row of cards.values()){row.controls.hidden=!on;row.body.inert=on;}
      }
      function dragFrame(){
        if(!drag)return;
        if(!stack.isConnected){stopDrag(true);return;}
        const current=drag,scroll=stack.closest('#sheetBody');
        const left=Math.max(4,Math.min(innerWidth-current.width-4,current.x-current.offsetX));
        current.preview.style.transform=`translate3d(${left}px,${current.y-current.offsetY}px,0)`;
        if(scroll){const bounds=scroll.getBoundingClientRect();if(current.y<bounds.top+55)scroll.scrollTop-=10;else if(current.y>bounds.bottom-55)scroll.scrollTop+=10;}
        const hit=document.elementFromPoint(current.x,current.y)?.closest('.today-widget');
        if(hit&&hit!==current.card&&hit.parentElement===stack){
          const box=hit.getBoundingClientRect();stack.insertBefore(current.card,current.y<box.top+box.height/2?hit:hit.nextSibling);
          current.card.setPointerCapture(current.pointer);update();
        }
        if(drag)drag.frame=requestAnimationFrame(dragFrame);
      }
      function beginDrag(id,pointer,x,y){
        cancelPending();if(!stack.isConnected)return;setArranging(true);
        const {card}=cards.get(id);card.focus({preventScroll:true});card.setPointerCapture(pointer);
        const box=card.getBoundingClientRect(),preview=card.cloneNode(true);preview.removeAttribute('data-widget');preview.removeAttribute('id');preview.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
        preview.classList.add('today-widget-drag-preview');preview.setAttribute('aria-hidden','true');preview.inert=true;preview.tabIndex=-1;
        preview.style.width=box.width+'px';preview.style.fontFamily=getComputedStyle(card).fontFamily;document.body.appendChild(preview);
        drag={id,card,preview,pointer,before:order(),x,y,offsetX:x-box.left,offsetY:y-box.top,width:box.width,frame:0};
        card.classList.add('is-dragging');stack.classList.add('is-dragging');suppressedUntil=Infinity;suppressedCard=card;
        addGestureListeners();dragFrame();
      }
      function pointerMove(e){
        if(pending&&pending.pointer===e.pointerId){if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>8)cancelPending();}
        if(drag?.pointer===e.pointerId){drag.x=e.clientX;drag.y=e.clientY;if(e.cancelable)e.preventDefault();}
      }
      function pointerEnd(e){if(pending?.pointer===e.pointerId)cancelPending();if(drag?.pointer===e.pointerId)stopDrag();}
      function pointerCancel(e){if(pending?.pointer===e.pointerId)cancelPending();if(drag?.pointer===e.pointerId)stopDrag(true);}
      // Let normal swipes scroll; once a stationary hold activates, retain the touch for dragging.
      function touchMove(e){if(drag&&e.cancelable)e.preventDefault();}
      function addGestureListeners(){
        document.addEventListener('pointermove',pointerMove,true);document.addEventListener('pointerup',pointerEnd,true);document.addEventListener('pointercancel',pointerCancel,true);document.addEventListener('touchmove',touchMove,{passive:false});
      }
      for(const [id,title,node] of rows){
        const card=el('section','today-widget'),controls=el('div','today-widget-controls'),label=el('b','',title),handle=el('button','today-widget-handle'),up=el('button','today-widget-move','↑'),down=el('button','today-widget-move','↓'),body=el('div','today-widget-body');
        card.dataset.widget=id;card.tabIndex=0;card.setAttribute('aria-label',title+' widget');card.setAttribute('aria-describedby',hint.id);
        handle.type=up.type=down.type='button';handle.setAttribute('aria-label','Drag '+title+' widget');handle.title='Drag to move, or use arrow keys';
        handle.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="8" cy="5" r="1.7"/><circle cx="16" cy="5" r="1.7"/><circle cx="8" cy="12" r="1.7"/><circle cx="16" cy="12" r="1.7"/><circle cx="8" cy="19" r="1.7"/><circle cx="16" cy="19" r="1.7"/></svg>';
        up.setAttribute('aria-label','Move '+title+' widget up');down.setAttribute('aria-label','Move '+title+' widget down');controls.hidden=true;controls.append(handle,label,up,down);body.appendChild(node);card.append(controls,body);stack.appendChild(card);cards.set(id,{card,controls,body,up,down,handle,title});
        up.onclick=()=>move(id,-1,up);down.onclick=()=>move(id,1,down);
        card.onkeydown=e=>{
          if(e.target===card&&['Enter',' '].includes(e.key)){e.preventDefault();setArranging(true);handle.focus({preventScroll:true});}
          else if(e.target===handle&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(id,e.key==='ArrowUp'?-1:1,handle);}
        };
        card.onpointerdown=e=>{
          if(e.button!==0||e.isPrimary===false||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
          if(e.target.closest('.today-widget-controls')&&e.target.closest('button')!==handle)return;
          cancelPending();if(drag)return;
          addGestureListeners();
          if(arranging){beginDrag(id,e.pointerId,e.clientX,e.clientY);return;}
          pending={pointer:e.pointerId,x:e.clientX,y:e.clientY,timer:setTimeout(()=>{if(pending)beginDrag(id,e.pointerId,e.clientX,e.clientY);},500)};
        };
        card.onlostpointercapture=e=>{if(drag?.pointer===e.pointerId)stopDrag(true);};
        card.oncontextmenu=e=>{if(pending||arranging)e.preventDefault();};
        card.addEventListener('click',e=>{if(e.target.closest('.today-widget-controls'))return;if(arranging||suppressedCard===card&&e.detail>0&&performance.now()<suppressedUntil){if(!drag&&suppressedCard===card){suppressedCard=null;suppressedUntil=0;}e.preventDefault();e.stopImmediatePropagation();}},true);
      }
      apply(context().meta.dashboardWidgetOrder);
      done.onclick=()=>{cancelPending();stopDrag();setArranging(false);cards.get(order()[0]).card.focus({preventScroll:true});};
      reset.onclick=()=>{const before=order();apply(WIDGET_IDS);if(commit(before))announce('Default widget order restored.');};
      host.addEventListener('pointerdown',e=>{if(arranging&&!e.target.closest('.today-widget,.today-arrange-bar')){cancelPending();stopDrag();setArranging(false);}});
      host.addEventListener('keydown',e=>{if(arranging&&e.key==='Escape'){e.preventDefault();e.stopPropagation();const current=drag?.id;cancelPending();stopDrag(true);setArranging(false);cards.get(current||order()[0]).card.focus({preventScroll:true});}});
    }
    function mountMoment(host) {
      const card=el('section','today-moment'),label=el('h3','today-card-label',"Today's little moment"),name=el('b','today-moment-name'),hint=el('p','today-moment-hint'),streak=el('span','today-streak'),got=el('button','chipbtn primary today-got','Got it');
      card.setAttribute('aria-label',"Today's little moment");got.type='button';got.onclick=()=>{safe(completeMoment);if(got.disabled){card.tabIndex=-1;card.focus({preventScroll:true});}};card.append(label,name,hint,streak,got);host.appendChild(card);
      const entry={panel:card,refresh(){const ctx=context(),daily=ctx.daily;if(!daily){card.hidden=true;return;}card.hidden=false;name.textContent=daily.name;hint.textContent=daily.D.done?'Done for today. A new moment tomorrow.':daily.hint;got.disabled=daily.D.done;got.textContent=daily.D.done?'Done for today':'Got it';streak.textContent=ctx.streak?`🔥 ${ctx.streak} day streak`:'A little moment for today';}};
      mounts.add(entry);entry.refresh();return card;
    }
    function mount(host,{beforeTasks,google,googleToday,openDay=()=>{},tasks:tasksHost=null}={}){
      const welcome=el('div','today-welcome'),hello=el('h2'),greetingSub=el('p','muted');welcome.append(hello,greetingSub);
      const panel=el('div','space-today'),sky=el('section','today-sky'),copy=el('div','today-sky-copy'),condition=el('p','today-condition'),chance=el('p','today-chance'),drops=el('div','today-drops'),updated=el('small','muted');sky.setAttribute('aria-label','Your sky today');drops.setAttribute('aria-hidden','true');
      for(let i=0;i<10;i++)drops.appendChild(el('span','','💧'));
      const weatherBody=el('div','today-weather');welcome.appendChild(condition);copy.append(chance,drops,updated);const details=el('div','today-weather-details');details.appendChild(copy);const week=el('nav','today-week');week.setAttribute('aria-label','This week');const feature=el('div','today-feature'),dashboardMain=el('div','today-main'),rail=el('aside','today-side');rail.setAttribute('aria-label','Tea and focus');weatherBody.append(welcome,details,week,feature,dashboardMain,rail);sky.appendChild(weatherBody);panel.appendChild(sky);
      const forecastCard=el('section','today-forecast-card');forecastCard.setAttribute('aria-label','Weather forecast');
      const currentWeather=el('div','today-forecast-current'),currentLabel=el('div','today-forecast-condition'),currentSymbol=el('span','today-forecast-symbol'),currentName=el('span'),currentTemp=el('strong','today-forecast-temperature'),currentNote=el('small','today-forecast-note'),forecastList=el('ol','today-forecast-list');currentSymbol.setAttribute('aria-hidden','true');currentLabel.append(currentSymbol,currentName);currentWeather.append(currentLabel,currentTemp,currentNote);forecastList.setAttribute('aria-label','Five-day forecast');forecastCard.append(currentWeather,forecastList);weatherBody.appendChild(forecastCard);
      let forecastKey='';const weatherSymbol=kind=>({clear:'☀',rain:'🌧',snow:'❄',storm:'⛈'}[kind] || '—');
      if(googleToday){sky.classList.add('has-task-focus');const focus=el('section','today-google-focus task-google-page');focus.setAttribute('aria-label',"Today's Google tasks");dashboardMain.appendChild(focus);}
      // The French word of the day fills the feature slot on its own.
      const duo=el('div','today-duo today-french');const frenchPane=el('section','today-feature-pane'),frenchToggle=el('button','today-feature-toggle','French Word');const featureId='today-feature-'+(++tabSeq);duo.id=featureId+'-french';frenchToggle.type='button';frenchToggle.setAttribute('aria-controls',duo.id);frenchToggle.setAttribute('aria-expanded','true');frenchPane.append(frenchToggle,duo);feature.append(frenchPane);feature.dataset.active='french';feature.classList.add('french-only');
      const quick=el('nav','today-quick today-rituals');quick.setAttribute('aria-label','Rituals');rail.setAttribute('aria-label','Room tools');rail.appendChild(quick);const chips={};
      for(const [id,icon,label] of [['tea','🫖','Tea'],['garden','🌱','Focus'],['letter','✉','Letter'],['ideas','💡','Idea']]){const chip=el('button','today-ritual'+(id==='garden'?' today-garden':'')),text=el('span'),status=el('small');chip.type='button';chip.dataset.ritual=id;text.append(el('b','',label),status);const symbol=el('span','ritual-icon',icon);symbol.setAttribute('aria-hidden','true');if(id==='letter'){const art=el('img','mail-access-icon');art.src='assets/mailbox-access.png';art.alt='';symbol.replaceChildren(art);}chip.append(symbol,text);chip.onclick=()=>id==='tea'?openTimer({target:'tea'}):openRitual(id);quick.appendChild(chip);chips[id]=status;}
      if(beforeTasks)beforeTasks(panel);
      const section=el('section','today-tasks'),header=el('div','task-journey'),summary=el('p','task-journey-summary'),track=el('div','task-day-path'),dude=el('div','task-journey-dude'),image=el('img'),sleep=el('span','task-journey-zzz','Zzz');
      image.alt='Your little roommate';image.width=84;image.height=84;dude.append(image,sleep);sleep.hidden=true;track.setAttribute('aria-hidden','true');
      for(const [key,label,icon] of [['morning','Morning','☀'],['afternoon','Afternoon','☁'],['evening','Evening','☾']]){const stop=el('span','task-path-stop '+key);stop.append(el('i','',icon),el('small','',label));track.appendChild(stop);}track.appendChild(dude);summary.setAttribute('role','status');header.append(summary,track);
      const form=el('form','today-task-form'),input=el('input'),add=el('button','chipbtn primary','＋ Add');input.type='text';input.maxLength=140;input.placeholder='A small thing for today…';input.setAttribute('aria-label','A little task');add.type='submit';form.append(input,add);const list=el('div','today-task-list'),notebook=el('div','task-notebook'),pageTitle=el('p','task-notebook-title','To-Do');
      const notebookHeading=el('div','task-notebook-heading'),counter=el('span','task-counter'),progress=el('div','task-list-progress'),progressFill=el('span');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Little things completed');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.appendChild(progressFill);notebookHeading.append(pageTitle,counter);notebook.append(notebookHeading,progress,list,header,form);
      let mountGoogle=null;
      // Google Tasks is just another little tab on the same notepad (it used to live in the weather card).
      if(google){const tabs=el('div','task-tabs'),googlePage=el('div','task-google-page'),uid='tasktab'+(++tabSeq);tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Task lists');googlePage.id=uid+'-google';googlePage.setAttribute('role','tabpanel');
        const mk=(id,label)=>{const b=el('button','task-tab',label);b.type='button';b.id=uid+'-'+id;b.dataset.tab=id;b.setAttribute('role','tab');tabs.appendChild(b);return b;};
        const local=mk('todo','My list'),remote=mk('google','Google');remote.setAttribute('aria-controls',googlePage.id);googlePage.setAttribute('aria-labelledby',remote.id);
        const show=(id,focus)=>{notebook.dataset.tab=id;googlePage.hidden=id!=='google';counter.hidden=id==='google';for(const b of [local,remote]){const on=b.dataset.tab===id;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;}try{localStorage.setItem('lr.todoTab',id);}catch(e){}if(focus)(id==='google'?remote:local).focus();};
        local.onclick=()=>show('todo');remote.onclick=()=>show('google');tabs.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(notebook.dataset.tab==='google'?'todo':'google',true);}};
        const heading=tasksHost?.querySelector('.todo-heading');if(heading){heading.appendChild(tabs);pageTitle.remove();}else pageTitle.replaceWith(tabs);notebook.appendChild(googlePage);mountGoogle=()=>google(googlePage);let saved='todo';try{saved=localStorage.getItem('lr.todoTab')==='google'?'google':'todo';}catch(e){}show(saved);}section.append(notebook);
      // In the To-Do tab the little roommate's day path leads, right under the title.
      if(tasksHost){notebookHeading.after(header);header.classList.add('is-top');}
      // The To-Do tab can host the notebook on its own; Today then keeps the sky, moment and rituals.
      if(tasksHost){host.appendChild(panel);tasksHost.appendChild(section);}else{dashboardMain.append(section);host.appendChild(panel);}mountWidgets(weatherBody,[['week','This week',week],['feature','French word',feature],['tasks',"Today's tasks",dashboardMain],['tools','Quick tools',rail],['weather','Weather',forecastCard]]);mountGoogle?.();if(googleToday)googleToday(panel.querySelector('.today-google-focus'));   // the Google panel only paints once it is on the page
      let signature='',lastPortrait='',weekKey='';form.onsubmit=e=>{e.preventDefault();safe(()=>{if(model.add(input.value))input.value='';});input.focus();};
      const entry={panel,refresh(){const ctx=context(),w=weather(ctx.meta,ctx.now || new Date()),part=daypart(ctx.meta.phase);sky.dataset.phase=part.theme;hello.textContent=part.greeting+', Cris';greetingSub.textContent=part.subline;const days=weekDays(ctx.now || new Date()),wk=JSON.stringify(days);if(wk!==weekKey){weekKey=wk;week.replaceChildren();for(const d of days){const b=el('button','today-week-day');b.type='button';b.dataset.date=d.date;b.setAttribute('aria-label',new Date(d.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}));if(d.today)b.setAttribute('aria-current','date');b.append(el('span','',d.label),el('b','',String(d.number)));b.onclick=()=>openDay(d.date);week.appendChild(b);}}sky.dataset.sky=ctx.meta.weather || 'clear';condition.textContent=w.label+' · '+(w.temperature || '—°C');chance.textContent=w.probability===null&&!ctx.meta.liveWeather?'':w.chance;chance.hidden=!chance.textContent;updated.textContent=w.stale?'Forecast cached':w.fetched?'Forecast updated':'';condition.title=condition.textContent;details.hidden=!chance.textContent&&w.probability===null&&!updated.textContent;drops.hidden=w.probability===null;[...drops.children].forEach((d,i)=>{d.classList.toggle('wet',i<w.probability/10);d.textContent=ctx.meta.weather==='snow'?'❄':'💧';});
        const forecast=weatherCard(ctx.meta,ctx.now || new Date()),fk=JSON.stringify(forecast);if(fk!==forecastKey){forecastKey=fk;currentSymbol.textContent=weatherSymbol(forecast.condition);currentName.textContent=forecast.label;currentTemp.textContent=forecast.temperature===null?'—°':forecast.temperature+'°';currentTemp.setAttribute('aria-label',forecast.temperature===null?'Temperature unavailable':forecast.temperature+' degrees Celsius');currentNote.textContent=forecast.note;forecastList.replaceChildren();for(const day of forecast.rows){const row=el('li'),date=el('time','',day.day),symbol=el('span','today-forecast-day-icon',weatherSymbol(day.condition)),low=el('span','today-forecast-low',day.low===null?'—':String(day.low)),high=el('span','today-forecast-high',day.high===null?'—':String(day.high));date.dateTime=day.date;symbol.setAttribute('aria-hidden','true');row.setAttribute('aria-label',day.day+(day.condition?', '+SKY[day.condition][1]+', low '+day.low+', high '+day.high+' degrees Celsius':', forecast unavailable'));row.append(date,symbol,low,high);forecastList.appendChild(row);}}
        const activeGarden=timers({focus:ctx.focus,now:+(ctx.now || new Date())}).find(t=>t.id==='garden'),tea=timers({tea:ctx.tea,now:+(ctx.now || new Date())})[0];chips.tea.textContent=tea?(tea.value==='Ready'?'ready':`brewing · ${tea.value}`):'ready to brew';chips.garden.textContent=activeGarden?activeGarden.value+' · Back to garden':'15 / 25 / 50 min';for(const [id,active] of [['tea',tea],['garden',activeGarden]]){const chip=chips[id].closest('button');chip.dataset.active=String(!!active);chip.setAttribute('aria-label',(id==='tea'?'Tea':'Focus')+' · '+chips[id].textContent);}chips.letter.textContent=ctx.letterDraft?'draft':'a fresh page';chips.ideas.textContent=ctx.ideaCount?`${ctx.ideaCount} spark${ctx.ideaCount===1?'':'s'}`:'drop a spark';
        const tasks=model.list(),j=journey(tasks),key=JSON.stringify(tasks.map(t=>[t.id,t.text,t.icon]));counter.textContent=`${j.checked} of ${j.total}`;progressFill.style.width=(j.progress*100)+'%';progress.setAttribute('aria-valuenow',String(Math.round(j.progress*100)));if(summary.textContent!==j.title)summary.textContent=j.title;header.dataset.stage=j.stage;header.dataset.pose=j.pose;header.dataset.remaining=String(j.left);track.style.setProperty('--task-progress',String(j.progress));sleep.hidden=!j.done;
        const pk=portraitKey()+':'+j.pose;if(pk!==lastPortrait){lastPortrait=pk;const src=portrait(j.pose);image.hidden=!src;if(src)image.src=src;}
        if(signature!==key){signature=key;list.replaceChildren();for(const t of tasks){
          const row=el('div','today-task'),icon=el('button','today-task-icon',t.icon),copy=el('div','today-task-copy'),text=el('span','today-task-text',t.text),remove=el('button','today-task-remove','×'),check=el('button','today-task-check'),mark=el('span','task-checkmark'),reward=el('span','task-check-reward'),picker=el('div','today-icon-picker');
          icon.type='button';icon.setAttribute('aria-label','Icon for task: '+t.text);icon.setAttribute('aria-expanded','false');picker.hidden=true;picker.setAttribute('role','group');picker.setAttribute('aria-label','Choose a task icon');
          icon.onclick=()=>{picker.hidden=!picker.hidden;icon.setAttribute('aria-expanded',String(!picker.hidden));};
          for(const emoji of ICONS){const choice=el('button','',emoji);choice.type='button';choice.setAttribute('aria-label','Use '+emoji);choice.setAttribute('aria-pressed',String(t.icon===emoji));choice.onclick=()=>safe(()=>{model.setIcon(t.id,emoji);entry.refresh();list.querySelector('[data-task="'+t.id+'"] .today-task-icon')?.focus();});picker.appendChild(choice);}
          mark.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12l4 4L19 6"/></svg>';
          check.type='button';check.setAttribute('role','checkbox');check.setAttribute('aria-label',t.text);check.append(mark,reward);mark.setAttribute('aria-hidden','true');reward.setAttribute('aria-hidden','true');
          check.onclick=()=>safe(()=>{const on=check.getAttribute('aria-checked')!=='true',earned=model.check(t.id,on);if(on){celebrate(t);check.classList.remove('celebrating');void check.offsetWidth;check.classList.add('celebrating');setTimeout(()=>check.classList.remove('celebrating'),700);dude.classList.remove('task-hop');void dude.offsetWidth;dude.classList.add('task-hop');if(earned){reward.textContent='+'+earned;check.classList.add('rewarding');setTimeout(()=>{check.classList.remove('rewarding');reward.textContent='';},1300);}}});
          remove.type='button';remove.setAttribute('aria-label','Remove task: '+t.text);remove.onclick=()=>safe(()=>{model.remove(t.id);input.focus();});copy.append(text,remove);row.dataset.task=t.id;row.append(check,copy,icon,picker);list.appendChild(row);
        }}
        const byId=new Map(tasks.map(t=>[t.id,t]));for(const row of list.children){const t=byId.get(row.dataset.task);row.querySelector('.today-task-check').setAttribute('aria-checked',String(!!t.done));row.classList.toggle('done',!!t.done);}
      }};mounts.add(entry);entry.refresh();return panel;
    }
    let next=0,tabSeq=0;
    function refresh(){for(const m of mounts){if(!m.panel.isConnected){mounts.delete(m);}else m.refresh();}
      const ctx=context(),rows=timers({tea:ctx.tea,focus:ctx.focus,now:+(ctx.now || new Date())});badges.hidden=hidden()||!rows.length;document.body.classList.toggle('has-timers',!badges.hidden);dock();
      const keys=rows.map(r=>r.id).join();if(badges.dataset.keys!==keys){badges.dataset.keys=keys;badges.replaceChildren();for(const row of rows){const b=el('button','timer-badge');b.type='button';b.dataset.timer=row.id;b.append(el('span','timer-icon',row.icon),el('b'),el('span','timer-value'));badges.appendChild(b);}}
      for(const row of rows){const b=[...badges.children].find(b=>b.dataset.timer===row.id);b.querySelector('b').textContent=row.title;b.querySelector('.timer-value').textContent=row.value;b.setAttribute('aria-label',row.title+' · '+row.value+' · Open timer');b.onclick=()=>openTimer(row);}
    }
    // Tea sits under the quick actions; other active timers keep the lower dock.
    function dock(){if(badges.hidden)return;const actions=document.querySelector('header .chips');if(actions){const r=actions.getBoundingClientRect(),top=r.bottom+10,height=badges.querySelector('[data-timer=tea]')?.getBoundingClientRect().height||44;let right=Math.max(14,innerWidth-r.right);const turns=document.querySelector('.rot');if(turns){const s=getComputedStyle(turns),box=turns.getBoundingClientRect();if(s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>.1&&box.top<top+height&&box.bottom>top)right=Math.max(right,innerWidth-box.left+10);}badges.style.setProperty('--tea-dock-top',top+'px');badges.style.setProperty('--tea-dock-right',right+'px');}let bottom=90;for(const node of document.querySelectorAll('.explorebar,.tools,#tray,#catbar')){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)<.1)continue;const r=node.getBoundingClientRect();if(r.width&&r.height&&r.top<innerHeight&&r.right>14&&r.left<innerWidth-90)bottom=Math.max(bottom,innerHeight-r.top+12);}badges.style.setProperty('--timer-dock',bottom+'px');}
    function viewport(){const v=window.visualViewport;badges.style.setProperty('--timer-keyboard',Math.max(0,v?innerHeight-v.height-v.offsetTop:0)+'px');dock();}
    window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();document.addEventListener('visibilitychange',refresh);window.addEventListener('resize',viewport);
    const dockResize=new ResizeObserver(dock);document.querySelectorAll('header,.chips,.explorebar,.tools,#tray,#catbar').forEach(n=>dockResize.observe(n));
    return {mount,mountMoment,refresh,badges,tick(time){if(time<next)return;next=time+1000;refresh();}};
  }
  const api={KEY,SKY,WIDGET_IDS,widgetOrder,daypart,weekDays,STARTERS,ICONS,iconFor,journey,weather,weatherCard,countdown,timers,create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRToday=api;
})(typeof window!=='undefined'?window:globalThis);
