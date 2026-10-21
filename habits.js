// Habit Pots: each habit is a potted plant in a room. A check-in is a tap on the
// plant (or its Today chip). Plants only grow; missed days simply stay empty.
// Bindings live here, by room and item id, never inside shared room items.
(function(root){
  const KEY='lr.habits',MAX=6,NAME_MAX=24,VARIANTS=4;
  const STAGES=['Just potted','A little sprout','Leaves unfolding','Nice and bushy','In bloom'];
  const VARIANT_NAMES=['Fern','Blossom','Herb','Succulent'];
  const FULL='Your shelf is full. Six habits is plenty.';
  const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const VALID_DAY=/^\d{4}-\d{2}-\d{2}$/;
  const parseDay=key=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12);};
  const cleanName=value=>String(value ?? '').replace(/\s+/g,' ').trim().slice(0,NAME_MAX);
  const validId=v=>typeof v==='string'||(typeof v==='number'&&Number.isFinite(v));
  // Derived state: nothing about growth is stored.
  const total=habit=>Object.keys(habit?.days || {}).length;
  function stage(habit){const n=total(habit);return n>=21?4:n>=10?3:n>=4?2:n>=1?1:0;}
  function lastDay(habit){const keys=Object.keys(habit?.days || {}).sort();return keys.at(-1) || null;}
  function resting(habit,now=new Date()){
    if(stage(habit)===0)return false;const last=lastDay(habit);if(!last)return false;
    const gap=Math.round((parseDay(day(now))-parseDay(last))/86400000);return gap>=7;
  }
  const displayStage=(habit,now=new Date())=>Math.max(0,stage(habit)-(resting(habit,now)?1:0));
  // Last 15 weeks as columns (Monday first), the final column holding today.
  function heatmap(habit,now=new Date(),weeks=15){
    const today=parseDay(day(now)),start=new Date(today);start.setDate(start.getDate()-(start.getDay()+6)%7-(weeks-1)*7);
    const todayKey=day(today),cols=[];
    for(let w=0;w<weeks;w++){const col=[];for(let r=0;r<7;r++){const d=new Date(start);d.setDate(start.getDate()+w*7+r);const key=day(d),future=key>todayKey;col.push({date:key,checked:!future&&!!habit?.days?.[key],today:key===todayKey,future});}cols.push(col);}
    return cols;
  }
  function stats(habit,now=new Date()){
    const month=day(now).slice(0,7),months={};for(const k of Object.keys(habit?.days || {}))months[k.slice(0,7)]=(months[k.slice(0,7)]||0)+1;
    return {total:total(habit),month:months[month]||0,bestMonth:Math.max(0,...Object.values(months))};
  }
  // Defensive load: malformed habits are dropped, bad fields coerced, never throws.
  function parse(saved){
    const list=Array.isArray(saved?.habits)?saved.habits:[],seen=new Set(),out=[];
    for(const h of list){
      if(!h||typeof h!=='object'||typeof h.id!=='string'||!h.id||seen.has(h.id))continue;
      const name=cleanName(h.name);if(!name)continue;
      const days={};if(h.days&&typeof h.days==='object'&&!Array.isArray(h.days))for(const k of Object.keys(h.days))if(VALID_DAY.test(k)&&h.days[k]===true)days[k]=true;
      const c=Number.isInteger(h.c)&&h.c>=0&&h.c<VARIANTS?h.c:0;
      const room=validId(h.room)?h.room:null,item=room!==null&&validId(h.item)?h.item:null;
      seen.add(h.id);out.push({id:h.id,name,c,room:item===null?null:room,item,created:typeof h.created==='string'&&VALID_DAY.test(h.created)?h.created:(Object.keys(days).sort()[0]||null),days});
      if(out.length>=MAX)break;
    }
    return {habits:out};
  }
  function create({store,now=Date.now}){
    let state;try{state=parse(store.get(KEY,null));}catch(e){state={habits:[]};}
    const persist=()=>{store.set(KEY,state);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(state))throw Error('Could not save your habits on this device.');};
    const copy=h=>h&&JSON.parse(JSON.stringify(h));
    const find=id=>state.habits.find(h=>h.id===id);
    const today=()=>day(new Date(now()));
    function add({name,c=0}={}){
      if(state.habits.length>=MAX)throw Error(FULL);
      const clean=cleanName(name);if(!clean)throw Error('Give your habit a name.');
      const id='habit-'+now().toString(36)+'-'+state.habits.length;
      const h={id,name:clean,c:Number.isInteger(c)&&c>=0&&c<VARIANTS?c:0,room:null,item:null,created:today(),days:{}};
      state.habits.push(h);try{persist();}catch(e){state.habits.pop();throw e;}return copy(h);
    }
    // Only ever adds today's key. Twice in a day is a no-op.
    function checkIn(id){
      const h=find(id);if(!h)return null;const date=today(),before=displayStage(h,new Date(now()));
      if(h.days[date])return {added:false,date,habit:copy(h),before,after:before};
      h.days[date]=true;try{persist();}catch(e){delete h.days[date];throw e;}
      return {added:true,date,habit:copy(h),before,after:displayStage(h,new Date(now()))};
    }
    function undoToday(id){const h=find(id),date=today();if(!h||!h.days[date])return false;delete h.days[date];persist();return true;}
    function rename(id,name){const h=find(id),clean=cleanName(name);if(!h)return null;if(!clean)throw Error('Give your habit a name.');h.name=clean;persist();return copy(h);}
    function retire(id){const i=state.habits.findIndex(h=>h.id===id);if(i<0)return null;const [gone]=state.habits.splice(i,1);persist();return copy(gone);}
    function bind(id,room,item){const h=find(id);if(!h)return null;h.room=room;h.item=item;persist();return copy(h);}
    function unbind(id){const h=find(id);if(!h||h.item===null&&h.room===null)return;h.room=null;h.item=null;persist();}
    const forItem=(room,item)=>copy(state.habits.find(h=>h.room===room&&h.item===item&&h.item!==null));
    // Focus Garden precedent: a removed pot or room leaves the habit unplaced, history kept.
    function detach(room,item){let changed=false;for(const h of state.habits)if(h.room===room&&h.item===item){h.room=null;h.item=null;changed=true;}if(changed)persist();return changed;}
    function detachRoom(room){let changed=false;for(const h of state.habits)if(h.room===room){h.room=null;h.item=null;changed=true;}if(changed)persist();return changed;}
    // The loaded room is the truth: a bound pot that is no longer there unbinds.
    function reconcile(roomId,room){let changed=false;for(const h of state.habits)if(h.room===roomId&&h.item!==null&&room.get(h.item)?.t!=='habitpot'){h.room=null;h.item=null;changed=true;}if(changed)persist();return changed;}
    function growth(room,item){const h=state.habits.find(h=>h.room===room&&h.item===item);if(!h)return {stage:2,resting:false,c:null};const at=new Date(now());return {stage:displayStage(h,at),resting:resting(h,at),c:h.c};}
    return {add,checkIn,undoToday,rename,retire,bind,unbind,forItem,detach,detachRoom,reconcile,growth,
      get:id=>copy(find(id)),list:()=>state.habits.map(copy),stats:id=>{const h=find(id);return h?stats(h,new Date(now())):null;},
      heatmap:id=>{const h=find(id);return h?heatmap(h,new Date(now())):null;},checkedToday:id=>!!find(id)?.days[today()],
      get full(){return state.habits.length>=MAX;},get state(){return JSON.parse(JSON.stringify(state));}};
  }
  // Sheets: a new habit (name + variant) and the almanac (stats, heatmap, undo/rename/retire).
  // Every user-provided name is written with textContent.
  function createView({model,sheet,place=()=>{},retire=()=>{},undo=()=>{},notice=()=>{},checkIn=()=>{},swatches=['#7fae6a','#e89ab4','#a3b58d','#6fb3a8']}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const button=(parent,label,cls,fn)=>{const b=el('button',cls,label);b.type='button';b.onclick=fn;parent.appendChild(b);return b;};
    let home=null;
    // Control Centre's Habit Pots: one row per habit. Tap to tend, the arrow opens its almanac.
    function openHome(){
      sheet('Habit Pots','',h=>{home=h('div','habit-home');paintHome();},'habits');
    }
    function paintHome(){
      if(!home?.isConnected)return;const list=model.list();home.replaceChildren();
      const intro=el('p','habit-note',list.length?'Tap a plant on the days you tend it. Missed days just stay empty.':'Pick something small. Each habit gets a little pot in your room that grows as you tend it.');home.appendChild(intro);
      if(list.length){const rows=el('ul','habit-rows');rows.setAttribute('aria-label','Your habits');
        for(const h of list){
          const checked=model.checkedToday(h.id),placed=h.item!==null,st=stage(h),rest=resting(h,new Date());
          const li=el('li','habit-row'+(checked?' is-checked':'')+(placed?'':' is-unplaced'));li.dataset.habit=h.id;li.style.setProperty('--swatch',swatches[h.c]);
          const tend=el('button','habit-tend');tend.type='button';tend.setAttribute('aria-pressed',String(checked));
          const dot=el('span','habit-dot');dot.setAttribute('aria-hidden','true');const text=el('span','habit-row-text');
          const status=!placed?'No home yet · tap to place':checked?'Tended today':'Not yet today';
          text.append(el('b','',h.name),el('small','',status+' · '+STAGES[Math.max(0,st-(rest?1:0))]));tend.append(dot,text);
          tend.setAttribute('aria-label',`${h.name}. ${status}.`);tend.onclick=()=>checkIn(h.id);
          const more=el('button','habit-more');more.type='button';more.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';more.setAttribute('aria-label',`Open the almanac for ${h.name}`);more.onclick=()=>openAlmanac(h.id);
          li.append(tend,more);rows.appendChild(li);
        }
        home.appendChild(rows);}
      if(model.full)home.appendChild(el('p','habit-status',FULL));
      else button(home,'Add a habit','habit-place habit-add',()=>openNew());
    }
    const back=host=>button(host,'‹ All habits','habit-back',()=>openHome());
    function openNew(){
      if(model.full){notice(FULL);return;}
      let choice=0;
      sheet('A new habit','',h=>{
        const host=h('div','habit-new');back(host);
        const label=el('label','habit-field');label.append(el('span','','What will you tend?'));const input=el('input');input.type='text';input.maxLength=NAME_MAX;input.placeholder='Stretch, read, water myself…';input.setAttribute('aria-label','Habit name');label.appendChild(input);host.appendChild(label);
        const group=el('div','habit-swatches');group.setAttribute('role','radiogroup');group.setAttribute('aria-label','Plant');host.appendChild(group);
        const paint=()=>{for(const b of group.children)b.setAttribute('aria-checked',String(Number(b.dataset.c)===choice));};
        VARIANT_NAMES.forEach((name,c)=>{const b=button(group,'','habit-swatch',()=>{choice=c;paint();});b.dataset.c=c;b.setAttribute('role','radio');b.setAttribute('aria-label',name);b.style.setProperty('--swatch',swatches[c]);b.appendChild(el('span','habit-swatch-dot'));b.appendChild(el('small','',name));});paint();
        const status=el('p','habit-status');status.setAttribute('role','status');
        const go=button(host,'Place it','habit-place',()=>{try{const habit=model.add({name:input.value,c:choice});if(!place(habit.id)){go.disabled=input.disabled=true;status.textContent='Saved without a home for now. Tap it on Today when there is room.';}}catch(e){status.textContent=e.message;if(e.message===FULL)notice(FULL);}});go.disabled=true;
        input.oninput=()=>{go.disabled=!cleanName(input.value);status.textContent='';};input.onkeydown=e=>{if(e.key==='Enter'&&!go.disabled){e.preventDefault();go.click();}};
        host.appendChild(status);requestAnimationFrame(()=>input.focus({preventScroll:true}));
      },'habits');
    }
    // An unplaced habit offers a home rather than a check-in.
    function openPlace(id){
      const habit=model.get(id);if(!habit)return;
      sheet('Habit Pots','',h=>{
        const host=h('div','habit-place-offer');back(host);const head=el('div','habit-head');head.style.setProperty('--swatch',swatches[habit.c]);head.append(el('span','habit-head-dot'),el('h3','habit-name',habit.name),el('p','habit-stage','No home yet'));host.appendChild(head);
        host.appendChild(el('p','habit-note','Give it a pot in this room. Its days so far come along.'));
        const status=el('p','habit-status');status.setAttribute('role','status');
        button(host,'Place it here','habit-place',()=>{if(!place(id))status.textContent='No floor space in this room right now.';});
        button(host,'Open its almanac','chipbtn habit-open',()=>openAlmanac(id));host.appendChild(status);
      },'habits');
    }
    function openAlmanac(id){
      const habit=model.get(id);if(!habit)return;
      sheet('Habit Pots','',h=>{
        const host=h('div','habit-almanac');host.dataset.habit=id;draw(host,id);
      },'habits');
    }
    function draw(host,id){
      const habit=model.get(id);if(!habit){host.replaceChildren();back(host);host.appendChild(el('p','habit-status','This habit has been retired.'));return;}
      const s=model.stats(id),st=stage(habit),rest=resting(habit,new Date()),checked=model.checkedToday(id);host.replaceChildren();back(host);
      const head=el('div','habit-head');head.style.setProperty('--swatch',swatches[habit.c]);const title=el('h3','habit-name',habit.name);const stageLine=el('p','habit-stage',STAGES[Math.max(0,st-(rest?1:0))]+(rest?' · resting':''));head.append(el('span','habit-head-dot'),title,stageLine);host.appendChild(head);
      const nums=el('div','habit-stats');for(const [v,l] of [[s.total,'days in all'],[s.month,'this month'],[s.bestMonth,'best month']]){const box=el('div','habit-stat');box.append(el('b','',String(v)),el('small','',l));nums.appendChild(box);}host.appendChild(nums);
      const weeks=model.heatmap(id),grid=el('div','habit-heatmap');grid.setAttribute('role','img');grid.setAttribute('aria-label',`Last 15 weeks: ${weeks.flat().filter(c=>c.checked).length} days tended`);grid.style.setProperty('--swatch',swatches[habit.c]);
      // Column-major: CSS flows cells down 7 weekday rows, one column per week.
      for(const col of weeks)for(const cell of col){const c=el('span','habit-cell'+(cell.checked?' is-checked':'')+(cell.today?' is-today':'')+(cell.future?' is-future':''));c.dataset.date=cell.date;grid.appendChild(c);}
      host.appendChild(grid);
      const actions=el('div','habit-actions');host.appendChild(actions);
      if(checked)button(actions,'Undo today','chipbtn habit-undo',()=>{if(model.undoToday(id)){undo(id);draw(host,id);}});
      button(actions,'Rename','chipbtn habit-rename',()=>{
        const form=el('form','habit-rename-form'),input=el('input');input.type='text';input.maxLength=NAME_MAX;input.value=habit.name;input.setAttribute('aria-label','Habit name');const save=el('button','chipbtn habit-save','Save');save.type='submit';form.append(input,save);
        const status=el('p','habit-status');form.onsubmit=e=>{e.preventDefault();try{model.rename(id,input.value);draw(host,id);}catch(err){status.textContent=err.message;}};actions.replaceWith(form,status);input.focus();input.select();
      });
      const retireButton=button(actions,'Retire habit','chipbtn habit-retire',()=>{if(!retireButton.dataset.confirm){retireButton.dataset.confirm='yes';retireButton.textContent='Retire for good?';return;}const gone=model.retire(id);if(gone)retire(gone);host.replaceChildren();back(host);host.appendChild(el('p','habit-status','Retired. Its days stay in your calendar memories.'));});
    }
    return {openHome,openNew,openAlmanac,openPlace,refresh:paintHome};
  }
  const api={KEY,MAX,NAME_MAX,STAGES,VARIANT_NAMES,FULL,day,cleanName,total,stage,resting,displayStage,heatmap,stats,parse,create,createView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRHabits=api;
})(typeof window!=='undefined'?window:globalThis);
