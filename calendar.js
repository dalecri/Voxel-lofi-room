// Private calendar memory. Dates are local civil dates, never UTC buckets.
// GOOGLE SETUP (about five minutes): create a Google Cloud project, enable the
// Calendar API AND Google Tasks API, configure the consent screen (add yourself as a test user), and
// create an OAuth Web client. Add your exact HTTPS origin (or localhost origin)
// under Authorized JavaScript origins, then paste its client ID below.
// No client secret belongs in this app. Google Identity Services' code flow
// requires a backend. This static app uses the GIS browser-token flow instead.
// Tokens expire naturally; reconnect is explicit. In OAuth testing mode, add test
// users. Production accounts may require Google verification of the requested scopes.
// Embedded Android WebViews may reject Google sign-in; the local calendar works
// regardless. Use the registered HTTPS browser origin for Google authorization.
(function(root){
  const GOOGLE_CLIENT_ID='446703031004-aga4sp6l11dknafmg8rpspi5m7lif8e4.apps.googleusercontent.com'; // OWNER CONFIG: OAuth client ID. Blank keeps everything local.
  const SCOPE='https://www.googleapis.com/auth/calendar.readonly';
  const TASKS_SCOPE='https://www.googleapis.com/auth/tasks.readonly',READ_SCOPES=SCOPE+' '+TASKS_SCOPE;
  const TASKS_WRITE_SCOPE='https://www.googleapis.com/auth/tasks',TASKS_EDIT_SCOPES=READ_SCOPES+' '+TASKS_WRITE_SCOPE;
  const LOG='lr.activityLog',EVENTS='lr.calendarEvents',TOKEN='lr.googleCalendarToken';
  const KINDS={tip:['Shared a cozy moment with Mallow','#d1ab61'],pushups:['Reached 50 pushups','#bf9563'],letter:['Wrote a letter','#bc8eaf'],tea:['Made tea','#b38d50'],tasks:['Finished a task','#789c87'],plant:['Watered a plant','#77a56b'],cat:['Fed a cat','#ce9376'],focus:['Finished a focus ritual','#8c91bd'],daily:['Found the daily moment','#d2ad54'],french:['Studied French','#c4896a']};
  const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const date=s=>new Date(s+'T12:00:00');
  const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(+date(s))&&day(date(s))===s;
  const monthKey=d=>day(d).slice(0,7);
  const monthBounds=d=>[new Date(d.getFullYear(),d.getMonth(),1),new Date(d.getFullYear(),d.getMonth()+1,1)];
  function moon(d){
    // Mean synodic month, anchored to the Jan 6 2000 18:14 UTC new moon.
    // Approximate to about a day; phase names are not an astronomical timetable.
    const period=29.530588853,age=((+d-Date.UTC(2000,0,6,18,14))/86400000%period+period)%period;
    const i=Math.round(age/period*8)%8;
    return {icon:['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][i],name:['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'][i],illumination:(1-Math.cos(age/period*Math.PI*2))/2};
  }
  function activityRows(value){return (Array.isArray(value)?value:[]).filter(r=>valid(r?.date)&&Array.isArray(r.events)).map(r=>({date:r.date,events:r.events.filter(k=>Object.hasOwn(KINDS,k)),refs:Array.isArray(r.refs)?r.refs.filter(k=>typeof k==='string'):[]}));}
  function activityWords(events){const counts={};for(const k of events || [])if(Object.hasOwn(KINDS,k))counts[k]=(counts[k]||0)+1;return Object.entries(counts).map(([k,n])=>n===1?KINDS[k][0]:({tip:`Shared ${n} cozy moments with Mallow`,pushups:`Reached the pushup goal ${n} times`,letter:`Wrote ${n} letters`,tea:`Made tea ${n} times`,tasks:`Finished ${n} tasks`,plant:`Watered ${n} plants`,cat:`Fed the cats ${n} times`,focus:`Finished ${n} focus rituals`,daily:'Found the daily moment',french:`Studied French ${n} times`})[k]);}
  function memoryFor(scenes,selected){if(!valid(selected))return null;return (Array.isArray(scenes)?scenes:[]).filter(s=>Number.isFinite(s?.createdAt)&&day(new Date(s.createdAt)).slice(5)===selected.slice(5)&&new Date(s.createdAt).getFullYear()<date(selected).getFullYear()).sort((a,b)=>b.createdAt-a.createdAt||String(a.id).localeCompare(String(b.id)))[0] || null;}
  function seasonalNotes(seasons,selected){if(!valid(selected))return [];const d=date(selected);return (seasons || []).flatMap(s=>{if(!Array.isArray(s.from))return [];const start=new Date(d.getFullYear(),s.from[0],s.from[1],12);if(start<d)start.setFullYear(start.getFullYear()+1);const days=Math.round((Date.UTC(start.getFullYear(),start.getMonth(),start.getDate())-Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))/86400000);return days===7?[`${({holiday:'The winter holiday set',halloween:'The Halloween set'})[s.group] || s.name || 'A seasonal set'} arrives next week.`]:[];});}
  function googleRows(body){return (Array.isArray(body?.items)?body.items:[]).filter(e=>e&&e.status!=='cancelled'&&typeof e.id==='string').flatMap(e=>{
    const allDay=valid(e.start?.date),start=allDay?e.start.date:typeof e.start?.dateTime==='string'?day(new Date(e.start.dateTime)):'';
    if(!valid(start))return [];const end=allDay&&valid(e.end?.date)?e.end.date:typeof e.end?.dateTime==='string'&&Number.isFinite(+new Date(e.end.dateTime))?day(new Date(+new Date(e.end.dateTime)-1)):start;
    return [{id:e.id,title:typeof e.summary==='string'?e.summary.slice(0,300):'An event',date:start,endDate:end,allDay,startAt:allDay?null:e.start.dateTime,endAt:allDay?null:e.end?.dateTime || null}];
  });}
  function taskRows(body){return (Array.isArray(body?.items)?body.items:[]).filter(t=>t&&typeof t.id==='string'&&!t.deleted&&!t.hidden&&(!t.status||t.status==='needsAction')).map(t=>{
    // Tasks due values are date-only civil dates encoded as midnight UTC. Keep
    // their calendar date; converting midnight UTC to local time shifts it back.
    const due=typeof t.due==='string'?t.due.slice(0,10):'';
    return {id:t.id,title:typeof t.title==='string'?t.title.trim().slice(0,300)||'Untitled task':'Untitled task',notes:typeof t.notes==='string'?t.notes.slice(0,2000):'',due:valid(due)?due:null,status:'needsAction'};
  });}
  function taskListRows(body){return (Array.isArray(body?.items)?body.items:[]).filter(t=>t&&typeof t.id==='string').map(t=>({id:t.id,title:typeof t.title==='string'?t.title.slice(0,140):'Task list'}));}
  // Google due values are civil dates, not instants: keep the local day boundary,
  // including 23/25-hour days, and leave the full cache intact for the calendar.
  function scheduledTaskList(lists,now=new Date()){
    const at=new Date(now),workday=at.getDay()>=1&&at.getDay()<=5&&at.getHours()<17,title=workday?'StatCan':'Todo';
    const match=(Array.isArray(lists)?lists:[]).find(list=>String(list?.title||'').trim().toLocaleLowerCase()===title.toLocaleLowerCase());
    return {id:match?.id || null,title:match?.title || title,requested:title};
  }
  function taskDayGroups(tasks,now=new Date()){
    const today=new Date(now),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
    const rows=Array.isArray(tasks)?tasks:[];
    return [{id:'today',title:'Today',date:day(today)},{id:'upcoming',title:'Upcoming',date:day(tomorrow)}]
      .map(group=>({...group,tasks:rows.filter(task=>task?.due===group.date)}));
  }
  function markers(selected,{activity=[],events=[],holidays=[],google=[],tasks=[]}={}){return {tasks:tasks.filter(t=>t.due===selected),kinds:[...new Set(activity.find(r=>r.date===selected)?.events || [])],events:events.filter(e=>e.date===selected),holidays:holidays.filter(h=>h.date===selected),google:google.filter(e=>e.date<=selected&&(e.allDay?selected<e.endDate || e.endDate===e.date:selected<=e.endDate))};}
  function grid(d){const [start,end]=monthBounds(d),cells=Array.from({length:(start.getDay()+6)%7},()=>null);
    const count=new Date(end.getFullYear(),end.getMonth(),0).getDate();for(let n=1;n<=count;n++)cells.push(day(new Date(start.getFullYear(),start.getMonth(),n)));return cells;}
  function create({store,now=()=>new Date()}){
    function append(kind,{date:selected=day(now()),id}={}){if(!Object.hasOwn(KINDS,kind)||!valid(selected))return false;const rows=activityRows(store.get(LOG,[]));let row=rows.find(r=>r.date===selected);if(!row){row={date:selected,events:[],refs:[]};rows.push(row);}const ref=id==null?null:kind+':'+id;if(ref&&row.refs.includes(ref))return false;row.events.push(kind);if(ref)row.refs.push(ref);rows.sort((a,b)=>a.date.localeCompare(b.date));store.set(LOG,rows.slice(-400));return true;}
    const state=()=>{const v=store.get(EVENTS,{});return {v:1,next:Number.isSafeInteger(v?.next)?v.next:1,items:(Array.isArray(v?.items)?v.items:[]).filter(e=>typeof e?.id==='string'&&valid(e.date)&&typeof e.title==='string')};};
    function save(s){store.set(EVENTS,s);if(JSON.stringify(store.get(EVENTS,null))!==JSON.stringify(s))throw Error('Could not save on this device.');}
    function edit(id,{title,date:selected}){title=String(title || '').trim().slice(0,140);if(!title||!valid(selected))throw Error('Add a title and a real date.');const s=state();let item=s.items.find(e=>e.id===id);if(id&&!item)throw Error('This event is no longer here.');if(!item){item={id:'local-'+s.next++,createdAt:+now()};s.items.push(item);}Object.assign(item,{title,date:selected});save(s);return {...item};}
    return {append,activity:()=>activityRows(store.get(LOG,[])),events:()=>state().items.map(e=>({...e})),add:e=>edit(null,e),edit,remove(id){const s=state();s.items=s.items.filter(e=>e.id!==id);save(s);},dismissMemory(id,selected){const key='lr.calendarMemories',old=store.get(key,[]);store.set(key,[...new Set([...(Array.isArray(old)?old:[]),selected+':'+id])].slice(-400));},memory(scenes,selected){const m=memoryFor(scenes,selected);return m&&!store.get('lr.calendarMemories',[]).includes(selected+':'+m.id)?m:null;}};
  }
  let identityLoading=null;
  function identityReady(){
    if(root.google?.accounts?.oauth2)return Promise.resolve();
    if(!identityLoading)identityLoading=new Promise((resolve,reject)=>{const script=root.document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.referrerPolicy='no-referrer';const timer=setTimeout(()=>{script.remove();reject(Error('Google sign-in is taking a rest'));},12000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Google sign-in is unavailable'));};root.document.head.appendChild(script);}).catch(e=>{identityLoading=null;throw e;});
    return identityLoading;
  }
  function authorizeGoogle(clientId,scope){
    const request=()=>new Promise((resolve,reject)=>{try{const client=root.google.accounts.oauth2.initTokenClient({client_id:clientId,scope,include_granted_scopes:String(scope).split(/\s+/).includes(TASKS_WRITE_SCOPE),callback:r=>r.error?reject(Error(r.error)):resolve(r),error_callback:()=>reject(Error('Could not open Google sign-in'))});client.requestAccessToken({prompt:'consent'});}catch(e){reject(e);}});
    // Request synchronously when the SDK is ready, preserving popup user activation.
    if(root.google?.accounts?.oauth2)return request();
    return identityReady().then(request);
  }
  // Authorization is injected: local calendar and Google response mapping do not
  // depend on a network or a configured OAuth client. Tokens bypass Store/SQLite.
  function createGoogle({clientId=GOOGLE_CLIENT_ID,scope=SCOPE,storage,authorize=authorizeGoogle,fetcher=(...a)=>root.fetch(...a),now=()=>Date.now()}={}){
    if(!storage)try{storage=root.localStorage;}catch(e){/* local tools need no token storage */}
    const requested=String(scope).split(/\s+/).filter(Boolean),required=requested.filter(s=>s!==TASKS_WRITE_SCOPE),cache=new Map(),taskRevisions=new Map(),pending=new Map(),controllers=new Set(),listeners=new Set();
    const completedTasks=new Map();let token=null,reconnect=false,generation=0;
    const granted=(value,needed=required)=>{const scopes=new Set(String(value || SCOPE).split(/\s+/));return needed.every(s=>scopes.has(s)||s===TASKS_SCOPE&&scopes.has(TASKS_WRITE_SCOPE));};
    try{const saved=JSON.parse(storage?.getItem(TOKEN)||'null');if(typeof saved?.access_token==='string'&&Number.isFinite(saved.expiresAt)){if(saved.expiresAt>now()&&granted(saved.scope))token=saved;else{reconnect=true;storage?.removeItem(TOKEN);}}}catch(e){}
    const notify=()=>{for(const fn of listeners)try{fn();}catch(e){/* one closed view cannot block another */}};
    const clear=(retry=false)=>{generation++;controllers.forEach(c=>c.abort());controllers.clear();token=null;cache.clear();pending.clear();completedTasks.clear();reconnect=retry;try{storage?.removeItem(TOKEN);}catch(e){}notify();};
    const connected=()=>!!clientId&&!!token&&token.expiresAt>now()&&granted(token.scope);
    const usable=needed=>{if(!connected()){if(token)clear(true);return false;}if(!granted(token.scope,[needed]))return false;return true;};
    async function connect(){if(!clientId)return false;if(!authorize){reconnect=true;notify();return false;}const prior=token,version=++generation;controllers.forEach(c=>c.abort());controllers.clear();pending.clear();try{const reply=await authorize(clientId,scope);if(version!==generation)return false;if(!reply?.access_token||!reply.scope||!granted(reply.scope,requested))throw Error();const listId=token?.listId || '@default';token={access_token:reply.access_token,scope:reply.scope,expiresAt:now()+Math.min(3600,Number(reply.expires_in)||3600)*1000,listId};storage.setItem(TOKEN,JSON.stringify(token));cache.clear();reconnect=false;notify();return true;}catch(e){if(version===generation){if(requested.includes(TASKS_WRITE_SCOPE)&&prior&&prior.expiresAt>now()&&granted(prior.scope)){token=prior;notify();}else clear(true);}return false;}}
    function cached(key){const c=cache.get(key);return connected()&&c&&c.until>now()?c.rows:[];}
    async function request(key,url,params,mapper,needed,ttl=Infinity){
      if(!usable(needed))return [];const old=cache.get(key);if(old&&old.until>now())return old.rows;if(pending.has(key))return pending.get(key);const version=generation,auth=token.access_token,revision=taskRevisions.get(key)||0;
      const job=(async()=>{const all=[];let page=null,pages=0;const seen=new Set(),abort=new AbortController();controllers.add(abort);const timer=setTimeout(()=>abort.abort(),12000);
        try{do{const p=new URLSearchParams(params);if(page)p.set('pageToken',page);const response=await fetcher(url+(p.size?'?'+p:''),{method:'GET',headers:{Authorization:'Bearer '+auth},credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:abort.signal});if(version!==generation||(taskRevisions.get(key)||0)!==revision)return [];if(response.status===401||response.status===403){clear(true);return [];}if(!response.ok)return [];const body=await response.json();if(version!==generation||(taskRevisions.get(key)||0)!==revision)return [];if(!body||typeof body!=='object'||(body.items!=null&&!Array.isArray(body.items)))return [];all.push(...mapper(body));page=typeof body.nextPageToken==='string'?body.nextPageToken:null;pages++;if(page&&seen.has(page))return [];if(page)seen.add(page);}while(page&&all.length<10000&&pages<20);if(version!==generation||(taskRevisions.get(key)||0)!==revision)return [];cache.set(key,{rows:all,until:now()+ttl});return all;}catch(e){return [];}finally{clearTimeout(timer);controllers.delete(abort);}})();pending.set(key,job);job.finally(()=>{if(pending.get(key)===job)pending.delete(key);});return job;
    }
    function events(d){const [start,end]=monthBounds(d);return request('events:'+monthKey(d),'https://www.googleapis.com/calendar/v3/calendars/primary/events',{timeMin:start.toISOString(),timeMax:end.toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'2500'},googleRows,SCOPE);}
    // Google's documented task-list collection is users/@me/lists, not /lists.
    const taskLists=()=>request('lists','https://tasks.googleapis.com/tasks/v1/users/@me/lists',{},taskListRows,TASKS_SCOPE,300000);
    const tasks=(listId=token?.listId || '@default')=>request('tasks:'+listId,'https://tasks.googleapis.com/tasks/v1/lists/'+encodeURIComponent(listId)+'/tasks',{showCompleted:'false',maxResults:'100'},taskRows,TASKS_SCOPE,60000);
    async function setTaskCompleted(listId,id,done){
      if(!usable(TASKS_WRITE_SCOPE))throw Error('Reconnect Google to enable task check-offs.');
      if(typeof id!=='string'||!id||typeof listId!=='string'||!listId)throw Error('This task is unavailable.');
      const version=generation,key='tasks:'+listId,receipt=listId+':'+id;
      const before=cache.get(key)?.rows.find(t=>t.id===id)||completedTasks.get(receipt),abort=new AbortController();controllers.add(abort);const timer=setTimeout(()=>abort.abort(),12000);
      // Cancel a pending list read before this write so a stale GET cannot put a
      // completed task back. In-flight reads are fenced by this per-list revision.
      const rev=(taskRevisions.get(key)||0)+1;taskRevisions.set(key,rev);pending.delete(key);
      try{
        const response=await fetcher('https://tasks.googleapis.com/tasks/v1/lists/'+encodeURIComponent(listId)+'/tasks/'+encodeURIComponent(id),{method:'PATCH',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({status:done?'completed':'needsAction',...(!done?{completed:null}:{})}),credentials:'omit',referrerPolicy:'no-referrer',signal:abort.signal});
        if(version!==generation)throw Error('Reconnect Google to save this check-off.');
        if(response.status===401||response.status===403){clear(true);throw Error('Reconnect Google to save this check-off.');}
        if(!response.ok)throw Error('Could not save your check-off. Try again when you’re online.');
        const body=await response.json();if(!body||typeof body!=='object'||body.id!==id)throw Error('Google returned an incomplete task. Refresh to check it.');
        if(version!==generation)throw Error('Reconnect Google to save this check-off.');
        const list=(cache.get(key)?.rows||[]).filter(t=>t.id!==id);
        if(done){if(before)completedTasks.set(receipt,before);if(completedTasks.size>200)completedTasks.delete(completedTasks.keys().next().value);}
        else {const restored=taskRows({items:[{...before,...body,status:'needsAction',hidden:false,deleted:false}]})[0];if(restored)list.push(restored);completedTasks.delete(receipt);}
        taskRevisions.set(key,(taskRevisions.get(key)||0)+1);pending.delete(key);cache.set(key,{rows:list,until:now()+60000});notify();return true;
      }finally{clearTimeout(timer);controllers.delete(abort);}
    }
    return {connect,events,taskLists,tasks,setTaskCompleted,get canCompleteTasks(){return connected()&&granted(token.scope,[TASKS_WRITE_SCOPE]);},get taskEditingRequested(){return requested.includes(TASKS_WRITE_SCOPE);},check(){if(token&&!connected())clear(true);return connected();},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
      get selectedList(){return token?.listId || '@default';},selectList(id){if(!connected()||typeof id!=='string'||!id||id.length>500)return;const before=token.listId;token.listId=id;try{storage.setItem(TOKEN,JSON.stringify(token));}catch(e){token.listId=before;return;}notify();},
      get cachedLists(){return cached('lists');},cachedEvents:d=>cached('events:'+monthKey(d)),get cachedTasks(){return cached('tasks:'+(token?.listId || '@default'));},cachedTasksFor(listId){return cached('tasks:'+listId);},
      disconnect(){const value=token?.access_token;clear();if(!value)return;const revoke=()=>{try{root.google.accounts.oauth2.revoke(value,()=>{});}catch(e){/* local disconnect still succeeds */}};
        if(root.google?.accounts?.oauth2?.revoke)revoke();else if(root.document)identityReady().then(revoke).catch(()=>{}); // A restored token may outlive the SDK page load.
      },get scope(){return scope;},get configured(){return !!clientId;},get connected(){return connected();},get reconnect(){return reconnect||!!token&&!connected();}};
  }
  function googleAuth(host,google,refresh,{label='Google Calendar',lists=google.cachedLists || []}={}){
    const el=(tag,cls,text)=>{const n=root.document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;},row=el('div','calendar-auth'),note=el('p','muted small');host.append(row,note);
    const upgrade=google.connected&&google.taskEditingRequested&&!google.canCompleteTasks;
    const b=el('button','chipbtn',upgrade?'Reconnect to enable task check-offs':google.connected?'Connected to '+label:google.reconnect?'Reconnect '+label:'Connect '+label);b.type='button';b.disabled=google.connected&&!upgrade||!google.configured;b.onclick=async()=>{b.disabled=true;await google.connect();if(host.isConnected)refresh();};row.appendChild(b);
    if(google.connected||google.reconnect){const off=el('button','chipbtn','Disconnect');off.type='button';off.onclick=()=>{google.disconnect();if(host.isConnected)refresh();};row.appendChild(off);}
    if(google.connected&&lists.length>1){const l=el('label','google-task-picker','Task list'),select=el('select');select.setAttribute('aria-label','Google task list');for(const e of [{id:'@default',title:'Default list'},...lists]){const option=el('option','',e.title);option.value=e.id;select.appendChild(option);}select.value=google.selectedList;select.onchange=()=>google.selectList(select.value);l.appendChild(select);row.appendChild(l);}
    note.textContent=!google.configured?'Google is optional. An OAuth client ID has not been configured. Everything local is ready.':google.reconnect?'Google needs a fresh connection. Tap Reconnect to try again. Your local lists and calendar are still here.':google.taskEditingRequested?'Task check-offs sync to your Google account. Calendar stays read-only.':'Optional and read-only. Calendar and Tasks are read; nothing is written to Google.';
  }
  function createTasksView({google,now=Date.now,holdMs=2500,undoMs=15000}){
    const mounts=new Set(),changes=new Map();let error='',nextRefresh=0;
    const el=(tag,cls,text)=>{const n=root.document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const key=(list,id)=>JSON.stringify([list,id]);
    function repaint(){for(const entry of mounts){if(!entry.host.isConnected)mounts.delete(entry);else paint(entry);}}
    async function change(task,listId,done,index=0){
      const k=key(listId,task.id),previous=changes.get(k);if(previous?.busy)return;
      const entry={task,listId,index:previous?.index??index,busy:true,done,hideAt:Infinity,until:Infinity};changes.set(k,entry);error='';repaint();
      try{
        await google.setTaskCompleted(listId,task.id,done);
        if(changes.get(k)!==entry||!google.connected)return;
        if(!done){changes.delete(k);repaint();return;}
        entry.busy=false;entry.hideAt=now()+holdMs;entry.until=now()+undoMs;
        entry.hideTimer=setTimeout(repaint,holdMs);
        entry.undoTimer=setTimeout(()=>{if(changes.get(k)===entry){changes.delete(k);repaint();}},undoMs);repaint();
      }catch(e){if(changes.get(k)!==entry)return;changes.delete(k);if(previous&&!done){changes.set(k,previous);}error=e.message||'Could not save your check-off. Try again.';repaint();}
    }
    const checkIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
    const selection=entry=>entry.scheduled?scheduledTaskList(google.cachedLists,new Date(now())):{id:google.selectedList};
    function paint(entry){
      const host=entry.host,focus=host.contains(root.document.activeElement)?root.document.activeElement.dataset.taskAction:null;host.replaceChildren();const heading=el('div','google-tasks-heading');
      if(entry.scheduled||!host.closest('.task-google-page'))heading.append(el('h3','',entry.scheduled?"Today's tasks":'Google Tasks'));host.appendChild(heading);
      const chosen=selection(entry);let allTasks=null;
      if(entry.scheduled&&google.connected){
        heading.appendChild(el('span','google-task-source',chosen.title+' · Google'));
        if(entry.openTasks){const all=el('button','chipbtn google-task-all','All tasks');all.type='button';all.onclick=entry.openTasks;allTasks=all;}
        if(google.taskEditingRequested&&!google.canCompleteTasks){const auth=el('div');host.appendChild(auth);googleAuth(auth,google,()=>update(entry),{label:'Google',lists:[]});}
      } else {const auth=el('div');host.appendChild(auth);googleAuth(auth,google,()=>update(entry),{label:'Google',...(entry.scheduled?{lists:[]}: {})});}
      if(error){const note=el('p','google-task-error',error);note.setAttribute('role','status');host.appendChild(note);}
      if(!google.connected)return;
      if(entry.scheduled&&!chosen.id){host.appendChild(el('p','muted small',entry.loadedLists?`Your ${chosen.requested} list wasn’t found. You can choose a list in To-Do.`:`Finding your ${chosen.requested} list…`));if(allTasks)host.appendChild(allTasks);return;}
      const listId=chosen.id,visible=[...(entry.scheduled?google.cachedTasksFor(listId):google.cachedTasks)];
      for(const state of [...changes.values()].sort((a,b)=>a.index-b.index))if(state.listId===listId&&(state.busy||state.done&&now()<state.hideAt)&&!visible.some(t=>t.id===state.task.id))visible.splice(Math.min(state.index,visible.length),0,state.task);
      const groups=el('div','google-task-days');host.appendChild(groups);
      for(const group of taskDayGroups(visible,now()).filter(group=>!entry.todayOnly||group.id==='today')){
        const section=el('section','google-task-day'),title=el('div','google-task-day-heading'),list=el('ul','google-task-list');
        section.dataset.day=group.id;section.setAttribute('aria-label',group.title+' Google Tasks');
        if(!entry.todayOnly)title.appendChild(el('h4','',group.title));
        const when=el('time','google-task-day-date');when.dateTime=group.date;when.textContent=(group.id==='upcoming'?'Tomorrow · ':'')+date(group.date).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});title.appendChild(when);
        if(!entry.todayOnly)section.appendChild(title);section.appendChild(list);groups.appendChild(section);
        for(const task of group.tasks){
          const state=changes.get(key(listId,task.id));if(state?.done&&now()>=state.hideAt)continue;
          const row=el('li','google-task-row'+(state?.done?' completed':''));row.dataset.task=task.id;
          const check=el('button','google-task-check');check.type='button';check.setAttribute('role','checkbox');check.setAttribute('aria-label',task.title);check.setAttribute('aria-checked',String(!!state?.done));check.disabled=!google.canCompleteTasks;check.setAttribute('aria-disabled',String(!!state?.busy||!google.canCompleteTasks));check.setAttribute('aria-busy',String(!!state?.busy));
          const mark=el('span','task-checkmark');mark.setAttribute('aria-hidden','true');if(state?.done)mark.innerHTML=checkIcon;check.appendChild(mark);
          check.dataset.taskAction='check:'+task.id;check.onclick=()=>change(task,listId,!state?.done,visible.indexOf(task));
          const text=el('span','google-task-copy');text.appendChild(el('b','',task.title));row.append(check,text);list.appendChild(row);
        }
        if(!list.children.length)section.appendChild(el('p','muted small google-task-empty',group.id==='today'?'Nothing scheduled for today.':'Nothing scheduled for tomorrow.'));
      }
      for(const state of changes.values())if(state.listId===listId&&state.done&&!state.busy&&now()<state.until){const feedback=el('div','google-task-feedback'),label=el('span','',state.task.title+' · completed'),undo=el('button','chipbtn','Undo');undo.type='button';undo.setAttribute('aria-label','Undo '+state.task.title);undo.dataset.taskAction='undo:'+state.task.id;undo.onclick=()=>change(state.task,listId,false);feedback.append(label,undo);host.appendChild(feedback);}
      if(allTasks)host.appendChild(allTasks);
      if(focus){const candidates=[...host.querySelectorAll('[data-task-action]')];(candidates.find(b=>b.dataset.taskAction===focus)||candidates.find(b=>b.dataset.taskAction==='undo:'+focus.slice(focus.indexOf(':')+1))||candidates.find(b=>b.dataset.taskAction==='check:'+focus.slice(focus.indexOf(':')+1)))?.focus({preventScroll:true});}
    }
    function update(entry){
      if(!entry.host.isConnected){mounts.delete(entry);return;}const version=++entry.version;paint(entry);
      if(google.connected)(async()=>{
        await google.taskLists();if(!entry.host.isConnected||entry.version!==version)return;entry.loadedLists=true;
        const list=selection(entry);if(list.id)await google.tasks(list.id);
        if(entry.host.isConnected&&entry.version===version)paint(entry);
      })();
    }
    google.subscribe(()=>{if(!google.connected){for(const c of changes.values()){clearTimeout(c.hideTimer);clearTimeout(c.undoTimer);}changes.clear();error='';}for(const entry of mounts)update(entry);});
    return {tick(time){if(time<nextRefresh)return;nextRefresh=time+60000;for(const entry of mounts)if(entry.host.isConnected&&!entry.host.closest('[hidden]')&&entry.host.closest('.sheet.open'))update(entry);},mount(parent,before,options={}){for(const entry of mounts)if(!entry.host.isConnected)mounts.delete(entry);const host=el('section','google-tasks');parent.insertBefore(host,before || null);const entry={host,version:0,...options};mounts.add(entry);update(entry);return host;},refresh(){for(const entry of mounts)update(entry);}};
  }
  function createView({model,google,sheet,atlas,meta,scenes,seasons=[],thumb,openScene,now=()=>new Date()}){
    const el=(tag,cls,text)=>{const n=root.document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const button=(host,label,fn,cls='chipbtn')=>{const b=el('button',cls,label);b.type='button';b.onclick=fn;host.appendChild(b);return b;};
    let current=now(),selected=day(current),version=0,observed='',activeHost=null,mode='month';
    google.subscribe?.(()=>{if(activeHost?.isConnected)(mode==='month'?month:detail)();});
    const sources=()=>JSON.stringify([model.activity(),model.events(),meta.liveExtras,meta.liveWeather,meta.weatherFetchedAt,holidays()]);
    const holidays=()=>meta.liveExtras?atlas.holidaysFor(current.getFullYear()):[];
    function auth(host,refresh){googleAuth(host,google,refresh);}
    function forecasts(host){const week=meta.liveWeather?meta.weatherDetails?.forecast:[];if(!Array.isArray(week)||!week.length)return;host.appendChild(el('h3','','The coming week'));const strip=el('div','calendar-forecast');strip.setAttribute('aria-label','Seven-day forecast');for(const f of week.filter(f=>f.date>=day(now())).slice(0,7)){const cell=el('div');cell.append(el('b','',date(f.date).toLocaleDateString(undefined,{weekday:'short'})),el('span','',({clear:'☀',rain:'🌧',snow:'❄',storm:'⛈'})[f.condition]||'☀'),el('small','',`${Math.round(f.high)}° / ${Math.round(f.low)}°`));strip.appendChild(cell);}host.appendChild(strip);if(+now()-(meta.weatherFetchedAt||0)>3600000)host.appendChild(el('p','muted small','Last forecast · cached'));}
    function month(){mode='month';observed=sources();const request=++version;sheet('Calendar','A little memory of your days. Empty days are simply empty.',h=>{const host=h('div','calendar-view');activeHost=host;const nav=el('nav','calendar-nav');nav.setAttribute('aria-label','Calendar months');button(nav,'‹',()=>{current=new Date(current.getFullYear(),current.getMonth()-1,1,12);month();}).setAttribute('aria-label','Previous month');nav.appendChild(el('h3','',current.toLocaleDateString(undefined,{month:'long',year:'numeric'})));button(nav,'›',()=>{current=new Date(current.getFullYear(),current.getMonth()+1,1,12);month();}).setAttribute('aria-label','Next month');host.appendChild(nav);button(host,'Today',()=>{current=now();selected=day(current);month();});const gridHost=el('div','calendar-grid');gridHost.setAttribute('aria-label','Month days');host.appendChild(gridHost);
      let remoteRows=[];const draw=remote=>{remoteRows=remote;if(!host.isConnected||request!==version)return;gridHost.replaceChildren();for(const wd of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])gridHost.appendChild(el('span','calendar-weekday',wd));for(const d of grid(current)){if(!d){gridHost.appendChild(el('span'));continue;}const data=markers(d,{activity:model.activity(),events:model.events(),holidays:holidays(),google:remote,tasks:google.cachedTasks || []}),b=button(gridHost,'',()=>{selected=d;detail();},'calendar-day'+(d===day(now())?' is-today':''));b.dataset.date=d;b.setAttribute('aria-label',[date(d).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}),...activityWords(model.activity().find(r=>r.date===d)?.events),...data.holidays.map(h=>h.name),data.events.length?`${data.events.length} local events`:'',data.google.length?`${data.google.length} Google events`:'',data.tasks.length?`${data.tasks.length} Google tasks`:''].filter(Boolean).join(' · '));if(d===day(now()))b.setAttribute('aria-current','date');b.appendChild(el('b','',String(date(d).getDate())));const dots=el('span','calendar-dots');for(const k of data.kinds){const dot=el('i','calendar-dot');dot.style.background=KINDS[k][1];dot.dataset.kind=k;dot.title=KINDS[k][0];dots.appendChild(dot);}if(data.events.length)dots.appendChild(el('i','calendar-local','•'));if(data.holidays.length)dots.appendChild(el('i','calendar-holiday','✦'));if(data.google.length)dots.appendChild(el('i','calendar-google','▰'));if(data.tasks.length)dots.appendChild(el('i','calendar-google-task','▢'));b.appendChild(dots);}};draw([]);Promise.all([google.events(current),google.tasks?.() || [],google.taskLists?.() || []]).then(([rows])=>{draw(google.connected?rows:[]);if(host.isConnected&&request===version){const old=host.querySelector('.calendar-auth-host');old.replaceChildren();auth(old,month);}});atlas.ensureHolidays?.(current.getFullYear()).then(()=>draw(remoteRows));forecasts(host);
      const upcoming=holidays().filter(h=>h.date>=day(now())).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,2);if(upcoming.length)host.appendChild(el('p','muted small','Coming up · '+upcoming.map(h=>`${date(h.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}: ${h.name}`).join(' · ')));
      for(const note of seasonalNotes(seasons,day(now())))host.appendChild(el('p','muted small',note));const legend=el('p','calendar-legend muted small','● Little moments · • Your events · ✦ Holiday · ▰ Google events · ▢ Google Tasks');host.appendChild(legend);const authHost=el('div','calendar-auth-host');host.appendChild(authHost);auth(authHost,month);
    });}
    function editor(host,event){const form=el('form','calendar-form'),titleLabel=el('label','','Title'),title=el('input'),dateLabel=el('label','','Date'),when=el('input'),status=el('p','muted small');title.type='text';title.maxLength=140;title.required=true;title.value=event?.title||'';when.type='date';when.required=true;when.value=event?.date||selected;titleLabel.appendChild(title);dateLabel.appendChild(when);form.append(titleLabel,dateLabel);const save=button(form,event?'Save event':'Add event',()=>{});save.type='submit';form.appendChild(status);host.appendChild(form);form.onsubmit=e=>{e.preventDefault();try{const item=model.edit(event?.id,{title:title.value,date:when.value});selected=item.date;current=date(selected);detail();}catch(e){status.textContent=e.message;}};}
    function detail(){mode='detail';const request=++version;sheet(date(selected).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}),'Your day, remembered gently.',h=>{const host=h('div','calendar-detail');activeHost=host;button(host,'← Month',month);const phase=moon(date(selected));host.appendChild(el('p','calendar-moon',phase.icon+' '+phase.name));const events=model.activity().find(r=>r.date===selected)?.events||[];host.appendChild(el('p','calendar-memory',events.length?activityWords(events).join(' · '):'A quiet day. Nothing needs filling in.'));for(const hol of holidays().filter(h=>h.date===selected))host.appendChild(el('p','calendar-holiday','✦ '+hol.name));for(const note of seasonalNotes(seasons,selected))host.appendChild(el('p','muted',note));
      for(const e of model.events().filter(e=>e.date===selected)){const row=el('div','calendar-event');row.appendChild(el('b','',e.title));button(row,'Edit',()=>{row.replaceChildren();editor(row,e);});button(row,'Delete',()=>{model.remove(e.id);detail();});host.appendChild(row);}const remote=el('div','calendar-remote');host.appendChild(remote);Promise.all([google.events(current),google.tasks?.() || []]).then(([rows,tasks])=>{if(!host.isConnected||request!==version)return;for(const e of markers(selected,{google:google.connected?rows:[]}).google){const text=e.allDay?'All day':new Date(e.startAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+(e.endAt?' to '+new Date(e.endAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'');remote.appendChild(el('p','calendar-google',`▰ ${text} · ${e.title}`));}if(google.connected){const due=markers(selected,{tasks}).tasks;if(due.length){remote.appendChild(el('h3','','Google Tasks'));for(const t of due)remote.appendChild(el('p','calendar-google-task','▢ '+t.title));}}if(google.reconnect){const note=el('div');host.appendChild(note);auth(note,detail);}});
      const memory=model.memory(scenes(),selected);if(memory){const card=el('div','calendar-reminiscence'),age=date(selected).getFullYear()-new Date(memory.createdAt).getFullYear(),b=button(card,`${age===1?'A year':age+' years'} ago today · ${memory.title || 'Your scene'}`,()=>openScene(memory),'calendar-memory-card');if(memory.decor&&thumb){const img=el('img');img.alt='';img.loading='lazy';b.appendChild(img);root.requestAnimationFrame(()=>{if(img.isConnected)try{img.src=thumb({...memory.decor,id:memory.id});}catch(e){img.remove();}});}button(card,'Dismiss memory',()=>{model.dismissMemory(memory.id,selected);card.remove();});host.appendChild(card);}
      host.appendChild(el('h3','','Add a local event'));editor(host);host.appendChild(el('p','muted small','Your events stay on this device and never travel in room codes.'));
    });}
    return {open(){current=now();selected=day(current);month();},month,detail,refresh(){const host=root.document.querySelector('.calendar-view');if(host?.isConnected&&host.closest('.sheet.open')&&sources()!==observed)month();}};
  }
  const api={GOOGLE_CLIENT_ID,SCOPE,TASKS_SCOPE,READ_SCOPES,TASKS_WRITE_SCOPE,TASKS_EDIT_SCOPES,LOG,EVENTS,TOKEN,KINDS,day,date,valid,moon,grid,activityRows,activityWords,memoryFor,seasonalNotes,googleRows,taskRows,taskListRows,taskDayGroups,scheduledTaskList,markers,create,authorizeGoogle,createGoogle,googleAuth,createTasksView,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRCalendar=api;
})(typeof window!=='undefined'?window:globalThis);
