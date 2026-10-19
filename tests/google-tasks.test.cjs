const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../calendar.js'),W=require('../widgets.js');
const fixture={items:[{id:'a',title:'PRIVATE_GOOGLE_TASK',notes:'Notes',due:'2026-10-18T00:00:00.000Z',status:'needsAction'},{id:'b',title:'No deadline',status:'needsAction'},{id:'c',title:'Done',status:'completed'},{id:'d',title:'Hidden',hidden:true},{id:'e',title:'Deleted',deleted:true},{title:'Missing ID'}]};
function env(extra={}){const map=new Map(),calls=[];let time=1000;const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},options={clientId:'fixture',scope:C.READ_SCOPES,storage,now:()=>time,authorize:async(id,scope)=>({access_token:'PRIVATE_SHARED_TOKEN',scope,expires_in:3600}),fetcher:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>url.includes('/users/@me/lists')?{items:[{id:'work',title:'Work'},{id:'life',title:'Life'}]}:url.includes('tasks.googleapis.com')?fixture:{items:[]}};},...extra};return {map,calls,storage,options,g:C.createGoogle(options),advance:n=>time+=n};}
test('taskRows clips text, filters completed/deleted/hidden tasks and retains due civil dates in local time',()=>{
 const before=structuredClone(fixture),rows=C.taskRows(fixture);assert.deepEqual(rows,[{id:'a',title:'PRIVATE_GOOGLE_TASK',notes:'Notes',due:'2026-10-18',status:'needsAction'},{id:'b',title:'No deadline',notes:'',due:null,status:'needsAction'}]);assert.deepEqual(fixture,before);assert.equal(C.markers('2026-10-18',{tasks:rows}).tasks.length,1);assert.equal(C.markers('2026-10-17',{tasks:rows}).tasks.length,0);
 const long=C.taskRows({items:[{id:'x',title:'x'.repeat(400),notes:'n'.repeat(3000),due:'invalid'}]})[0];assert.equal(long.title.length,300);assert.equal(long.notes.length,2000);assert.equal(long.due,null);assert.deepEqual(C.taskRows({items:'bad'}),[]);
 const old=process.env.TZ;try{process.env.TZ='America/Toronto';assert.equal(C.taskRows(fixture)[0].due,'2026-10-18');}finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
test('one both-readonly authorization serves Calendar and Tasks with a shared private token/list choice',async()=>{
 let auths=0;const e=env({authorize:async(id,scope)=>{auths++;assert.equal(scope,C.READ_SCOPES);return {access_token:'PRIVATE_SHARED_TOKEN',scope,expires_in:3600};}});assert(await e.g.connect());await e.g.events(new Date(2026,9,1));assert.equal((await e.g.taskLists()).length,2);assert.equal((await e.g.tasks()).length,2);await e.g.tasks();assert.equal(e.calls.length,3);assert.equal(auths,1);
 const url=new URL(e.calls[2].url);assert.equal(url.pathname,'/tasks/v1/lists/%40default/tasks');assert.equal(url.searchParams.get('showCompleted'),'false');assert.equal(url.searchParams.get('maxResults'),'100');for(const c of e.calls){assert.equal(c.options.method,'GET');assert(!c.options.body);assert.equal(c.options.headers.Authorization,'Bearer PRIVATE_SHARED_TOKEN');assert(!c.url.includes('PRIVATE_SHARED_TOKEN'));}
 e.g.selectList('work');await e.g.tasks();assert.equal(C.createGoogle(e.options).selectedList,'work');assert.deepEqual([...e.map.keys()],[C.TOKEN]);assert(!e.map.get(C.TOKEN).includes('PRIVATE_GOOGLE_TASK'));assert(e.map.get(C.TOKEN).includes(C.TASKS_SCOPE));e.advance(60001);await e.g.tasks();assert.equal(e.calls.length,5);
 const partial=env({authorize:async()=>({access_token:'bad',scope:C.SCOPE})});assert.equal(await partial.g.connect(),false);assert(partial.g.reconnect);assert.equal(partial.map.size,0);
});
test('401/403 on either API clears shared auth, both remote caches and flags every view for reconnect',async()=>{
 for(const target of ['calendar','lists','tasks'])for(const status of [401,403]){let fail=false;const e=env({fetcher:async url=>({ok:!fail,status:fail?status:200,json:async()=>({items:url.includes('/users/@me/lists')?[{id:'life',title:'Life'}]:fixture.items})})});await e.g.connect();await e.g.tasks();assert.equal(e.g.cachedTasks.length,2);let notifications=0;e.g.subscribe(()=>notifications++);fail=true;
 if(target==='calendar')await e.g.events(new Date());else if(target==='lists')await e.g.taskLists();else await e.g.tasks('fresh-list');
 assert.equal(e.g.connected,false);assert.equal(e.g.reconnect,true);assert.equal(e.map.size,0);assert.deepEqual(e.g.cachedTasks,[]);assert.deepEqual(e.g.cachedLists,[]);assert(notifications>0);assert.deepEqual(await e.g.tasks(),[]);}
});
test('disconnect revokes once, clears clients and rejects late in-flight results',async()=>{
 const previous=globalThis.google;let revoked=[];globalThis.google={accounts:{oauth2:{revoke:(token,cb)=>{revoked.push(token);cb();}}}};
 try{let resolve;const e=env({fetcher:()=>new Promise(r=>resolve=r)});await e.g.connect();let changes=0;e.g.subscribe(()=>changes++);const pending=e.g.tasks();e.g.disconnect();resolve({ok:true,status:200,json:async()=>fixture});assert.deepEqual(await pending,[]);assert.deepEqual(e.g.cachedTasks,[]);assert.equal(e.g.connected,false);assert.equal(e.g.reconnect,false);assert.deepEqual(revoked,['PRIVATE_SHARED_TOKEN']);assert.equal(e.map.size,0);assert.equal(changes,1);}finally{globalThis.google=previous;}
});
test('unconfigured client stays local; network/malformed data fail softly; pagination stays read-only',async()=>{
 const off=env({clientId:'',authorize:()=>assert.fail('no auth'),fetcher:()=>assert.fail('no network')});assert.equal(await off.g.connect(),false);assert.deepEqual(await off.g.tasks(),[]);assert.deepEqual(await off.g.taskLists(),[]);
 for(const fetcher of [async()=>{throw Error('offline');},async()=>({ok:false,status:503}),async()=>({ok:true,json:async()=>{throw Error('bad JSON');}}),async()=>({ok:true,json:async()=>({items:'bad'})})]){const e=env({fetcher});await e.g.connect();assert.deepEqual(await e.g.tasks(),[]);assert(e.g.connected);}
 const calls=[],e=env({fetcher:async url=>{calls.push(url);return {ok:true,json:async()=>url.includes('pageToken')?{items:[{id:'second',title:'second'}]}:{items:[{id:'first',title:'first'}],nextPageToken:'next'}};}});await e.g.connect();assert.equal((await e.g.tasks()).length,2);assert.equal(calls.length,2);assert(new URL(calls[1]).searchParams.has('pageToken'));
});
test('Google tasks/token/list never enter shared room decor or the local Today store',async()=>{
 const e=env();await e.g.connect();const tasks=await e.g.tasks();const room={name:'Room',items:[{id:1,t:'calendar',googleTasks:tasks}],googleTasks:tasks,googleCalendarToken:JSON.parse(e.map.get(C.TOKEN)),todayTasks:tasks};const shared=W.shareDecor(room);assert(!JSON.stringify(shared).includes('PRIVATE'));assert(!('googleTasks' in shared));assert(!('googleTasks' in shared.items[0]));assert.deepEqual([...e.map.keys()],[C.TOKEN]);
});
test('legacy calendar-only consent requires reconnect for both scopes; expiry notifies and clears both caches',async()=>{
 const e=env();e.map.set(C.TOKEN,JSON.stringify({access_token:'legacy',expiresAt:5000}));const upgraded=C.createGoogle(e.options);assert(!upgraded.connected);assert(upgraded.reconnect);assert.equal(e.map.size,0);assert.deepEqual(await upgraded.tasks(),[]);
 await upgraded.connect();await upgraded.tasks();let changes=0;upgraded.subscribe(()=>changes++);e.advance(3600001);assert.equal(upgraded.check(),false);assert(upgraded.reconnect);assert.equal(changes,1);assert.deepEqual(upgraded.cachedTasks,[]);assert.equal(e.map.size,0);
});

test('dashboard task groups include only due today and tomorrow without changing the calendar cache',()=>{
 const rows=C.taskRows({items:[{id:'today',due:'2026-10-19T00:00:00Z'},{id:'tomorrow',due:'2026-10-20T00:00:00Z'},{id:'past',due:'2026-10-18T00:00:00Z'},{id:'later',due:'2026-10-21T00:00:00Z'},{id:'undated'},{id:'done',due:'2026-10-19T00:00:00Z',status:'completed'}]}),before=structuredClone(rows),groups=C.taskDayGroups(rows,new Date(2026,9,19,23,59));
 assert.deepEqual(groups.map(g=>[g.id,g.date,g.tasks.map(t=>t.id)]),[['today','2026-10-19',['today']],['upcoming','2026-10-20',['tomorrow']]]);assert.deepEqual(rows,before);assert.equal(C.markers('2026-10-21',{tasks:rows}).tasks[0].id,'later');
 const next=C.taskDayGroups(rows,new Date(2026,9,20,0,0));assert.deepEqual(next.map(g=>g.tasks.map(t=>t.id)),[['tomorrow'],['later']]);assert.ok(C.taskDayGroups([],new Date()).every(g=>g.tasks.length===0));
});
test('task groups follow local midnight, DST and month/year boundaries',()=>{
 const previous=process.env.TZ;try{process.env.TZ='America/Toronto';
 for(const [now,today,tomorrow] of [['2026-10-20T02:30:00Z','2026-10-19','2026-10-20'],['2026-03-08T05:30:00Z','2026-03-08','2026-03-09'],['2026-11-01T04:30:00Z','2026-11-01','2026-11-02'],['2026-12-31T17:00:00Z','2026-12-31','2027-01-01']])assert.deepEqual(C.taskDayGroups([],new Date(now)).map(g=>g.date),[today,tomorrow]);
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('Today chooses StatCan before 17:00 on weekdays and Todo after hours or on weekends',()=>{
 const lists=[{id:'work',title:'  statcan  '},{id:'home',title:'TODO'},{id:'other',title:'Other'}];
 for(const [at,id] of [[new Date(2026,9,19,0,0),'work'],[new Date(2026,9,19,16,59),'work'],[new Date(2026,9,19,17,0),'home'],[new Date(2026,9,23,23,0),'home'],[new Date(2026,9,24,9,0),'home'],[new Date(2026,9,25,9,0),'home'],[new Date(2026,9,26,9,0),'work']])assert.equal(C.scheduledTaskList(lists,at).id,id);
 assert.deepEqual(C.scheduledTaskList([],new Date(2026,9,19,10)),{id:null,title:'StatCan',requested:'StatCan'});assert.equal(C.scheduledTaskList(lists,new Date(2026,9,24,10)).requested,'Todo');
});
test('reading a scheduled list leaves manual list selection and other task caches intact',async()=>{
 const e=env({fetcher:async url=>({ok:true,status:200,json:async()=>({items:[{id:'task',title:url,due:'2026-10-19T00:00:00Z'}]})})});await e.g.connect();e.g.selectList('other');await e.g.tasks('other');await e.g.tasks('statcan');await e.g.tasks('todo');
 assert.equal(e.g.selectedList,'other');assert.ok(e.g.cachedTasks[0].title.includes('/other/'));assert.ok(e.g.cachedTasksFor('statcan')[0].title.includes('/statcan/'));assert.ok(e.g.cachedTasksFor('todo')[0].title.includes('/todo/'));assert.equal(JSON.parse(e.map.get(C.TOKEN)).listId,'other');e.g.disconnect();assert.deepEqual(e.g.cachedTasksFor('statcan'),[]);
});
