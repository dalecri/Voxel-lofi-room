const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../calendar.js'),W=require('../widgets.js');
function fixture({scope=C.TASKS_EDIT_SCOPES,legacy=false,fetcher}={}){
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},calls=[];
 let time=1000,status=200,deny=false;const items=[{id:'a',title:'PRIVATE_TASK',notes:'notes',due:'2026-10-18T00:00:00.000Z',status:'needsAction'},{id:'b',title:'Second',status:'needsAction'}];
 if(legacy)storage.setItem(C.TOKEN,JSON.stringify({access_token:'old',expiresAt:9999999,scope:C.READ_SCOPES,listId:'list'}));
 const g=C.createGoogle({clientId:'fixture',scope,storage,now:()=>time,authorize:async(id,requested)=>{assert.equal(requested,scope);if(deny)throw Error('denied');return {access_token:'new',expires_in:3600,scope:requested};},fetcher:fetcher||(async(url,options)=>{calls.push({url,options});if(options.method==='PATCH'){const body=JSON.parse(options.body),task=items.find(t=>url.endsWith('/'+t.id));if(status!==200)return {ok:false,status};Object.assign(task,body);return {ok:true,status:200,json:async()=>({...task})};}return {ok:true,status:200,json:async()=>({items:items.filter(t=>t.status==='needsAction').map(t=>({...t}))})};})});
 return {g,map,storage,calls,items,setStatus:v=>status=v,setDeny:v=>deny=v,setTime:v=>time=v};
}
test('legacy read grants keep reading, require Tasks consent, and survive a declined upgrade',async()=>{
 const f=fixture({legacy:true});assert.ok(f.g.connected);assert.equal(f.g.canCompleteTasks,false);await f.g.tasks('list');assert.equal(f.g.cachedTasks.length,2);
 await assert.rejects(f.g.setTaskCompleted('list','a',true),/Reconnect/);assert.ok(f.calls.every(c=>c.options.method==='GET'));
 f.setDeny(true);assert.equal(await f.g.connect(),false);assert.ok(f.g.connected);assert.equal(f.g.cachedTasks.length,2);
 f.setDeny(false);assert.ok(await f.g.connect());assert.ok(f.g.canCompleteTasks);assert.deepEqual([...f.map.keys()],[C.TOKEN]);assert.ok(!f.g.scope.includes('calendar.events'));
});
test('complete and Undo PATCH status only, restore the task and leave local tasks alone',async()=>{
 const f=fixture();await f.g.connect();await f.g.tasks();await f.g.setTaskCompleted('@default','a',true);assert.deepEqual(f.g.cachedTasks.map(t=>t.id),['b']);
 await f.g.setTaskCompleted('@default','a',false);assert.deepEqual(f.g.cachedTasks.map(t=>t.id).sort(),['a','b']);assert.equal(f.g.cachedTasks.find(t=>t.id==='a').due,'2026-10-18');
 const writes=f.calls.filter(c=>c.options.method==='PATCH');assert.deepEqual(writes.map(c=>JSON.parse(c.options.body)),[{status:'completed'},{status:'needsAction',completed:null}]);assert.ok(writes[0].url.endsWith('/lists/%40default/tasks/a'));assert.equal(writes[0].options.credentials,'omit');
});
test('HTTP and network failures restore state; auth failures clear both scopes',async()=>{
 const f=fixture();await f.g.connect();await f.g.tasks();f.setStatus(503);await assert.rejects(f.g.setTaskCompleted('@default','a',true),/online/);assert.equal(f.g.cachedTasks.length,2);
 for(const status of [401,403]){f.setStatus(200);await f.g.connect();await f.g.tasks();f.setStatus(status);await assert.rejects(f.g.setTaskCompleted('@default','a',true),/Reconnect/);assert.equal(f.g.connected,false);assert.equal(f.g.reconnect,true);assert.deepEqual(f.g.cachedTasks,[]);assert.equal(f.map.size,0);}
});
test('a stale GET started during a write cannot resurrect a completed task',async()=>{
 let finishPatch,finishGet,time=1000,reading=false;const f=fixture({fetcher:async(url,options)=>{
  if(options.method==='PATCH')return new Promise(r=>finishPatch=r);
  if(reading)return new Promise(r=>finishGet=r);
  return {ok:true,status:200,json:async()=>({items:[{id:'a',title:'PRIVATE_TASK',status:'needsAction'}]})};
 }});await f.g.connect();await f.g.tasks();f.setTime(70000);reading=true;
 const write=f.g.setTaskCompleted('@default','a',true),read=f.g.tasks();
 finishPatch({ok:true,status:200,json:async()=>({id:'a',status:'completed'})});await write;
 finishGet({ok:true,status:200,json:async()=>({items:[{id:'a',title:'PRIVATE_TASK',status:'needsAction'}]})});assert.deepEqual(await read,[]);assert.deepEqual(f.g.cachedTasks,[]);
});
test('disconnect during a write never restores Google content or credentials',async()=>{
 let finish;const f=fixture({fetcher:()=>new Promise(r=>finish=r)});await f.g.connect();const write=f.g.setTaskCompleted('@default','a',true);f.g.disconnect();finish({ok:true,status:200,json:async()=>({id:'a',status:'completed'})});await assert.rejects(write,/Reconnect/);assert.deepEqual(f.g.cachedTasks,[]);assert.equal(f.map.size,0);
});
test('GIS incremental consent enables task check-offs, with no calendar write scope',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');let config;
 const scope={window:{google:{accounts:{oauth2:{initTokenClient:o=>{config=o;return {requestAccessToken:()=>o.callback({access_token:'fixture',scope:o.scope})};}}}}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../calendar.js'),'utf8'),scope);await scope.window.LRCalendar.authorizeGoogle('fixture',C.TASKS_EDIT_SCOPES);assert.equal(config.include_granted_scopes,true);assert.ok(config.scope.split(' ').includes(C.TASKS_WRITE_SCOPE));assert.ok(!config.scope.includes('calendar.events'));
 assert.ok(!JSON.stringify(W.shareDecor({items:[],googleTasks:[{title:'PRIVATE_TASK'}]})).includes('PRIVATE_TASK'));
});

test('Google may omit the redundant tasks.readonly grant when full Tasks scope is present',async()=>{
 const map=new Map([[C.TOKEN,JSON.stringify({access_token:'fixture',expiresAt:9999999,scope:C.SCOPE+' '+C.TASKS_WRITE_SCOPE})]]),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const g=C.createGoogle({clientId:'fixture',scope:C.TASKS_EDIT_SCOPES,storage,now:()=>1000,fetcher:async()=>({ok:true,json:async()=>({items:[]})})});assert.ok(g.connected);assert.ok(g.canCompleteTasks);assert.deepEqual(await g.tasks(),[]);
});
