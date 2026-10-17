const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../calendar.js'),W=require('../weather.js'),S=require('../widgets.js');
function fixture(){const data=new Map(),store={get:(k,d)=>structuredClone(data.get(k)??d),set:(k,v)=>data.set(k,structuredClone(v))};return {data,store};}
test('activity appends known kinds, counts tasks and deduplicates identity within a day; oldest days prune at 400',()=>{
 const {store}=fixture(),m=C.create({store,now:()=>new Date(2026,9,16,14)});for(const k of Object.keys(C.KINDS))assert.ok(m.append(k));m.append('tasks',{id:'a'});m.append('tasks',{id:'b'});assert.equal(m.append('tasks',{id:'a'}),false);assert.equal(m.append('unknown'),false);
 assert.ok(C.activityWords(m.activity()[0].events).includes('Finished 3 tasks'));
 for(let i=0;i<450;i++)m.append('tea',{date:C.day(new Date(2026,0,i+1))});const rows=m.activity();assert.equal(rows.length,400);assert.ok(rows.every((r,i)=>i===0||r.date>rows[i-1].date));assert.equal(C.create({store}).activity().length,400);
});
test('real model hooks record changed letters, checked tasks, brews only once',()=>{
 const {store}=fixture();let time=Date.UTC(2026,9,16,14);const now=()=>new Date(time),m=C.create({store,now}),L=require('../letters.js'),T=require('../today.js'),Tools=require('../room-tools.js');
 const letters=L.create({store,now,clean:s=>s,onSaved:l=>m.append('letter',{id:l.id})});letters.add('Room');letters.update({letterhead:'Room',body:'A real letter'});letters.update({letterhead:'Room',body:'A real letter'});letters.update({letterhead:'Room',body:'A longer letter'});
 const tasks=T.create({store,onChecked:t=>m.append('tasks',{id:t.id})});tasks.add('Tea');const id=tasks.list()[0].id;tasks.check(id,true);tasks.check(id,true);tasks.check(id,false);tasks.check(id,true);
 const tools=Tools.create({store,now,onBrew:t=>m.append('tea',{id:t.endAt})});tools.brew(3);
 assert.deepEqual(m.activity()[0].events,['letter','tasks','tea']);
});
test('dots, holiday markers and private event CRUD map to exact local dates',()=>{
 const {store}=fixture(),m=C.create({store});const event=m.add({title:' PRIVATE_EVENT ',date:'2026-10-16'});m.edit(event.id,{title:'Edited',date:'2026-10-17'});assert.deepEqual(C.create({store}).events().map(e=>[e.title,e.date]),[['Edited','2026-10-17']]);assert.throws(()=>m.add({title:'bad',date:'2026-02-30'}));m.append('cat',{date:'2026-10-17'});m.append('tea',{date:'2026-10-17'});m.append('cat',{date:'2026-10-17'});
 const x=C.markers('2026-10-17',{activity:m.activity(),events:m.events(),holidays:[{date:'2026-10-17',name:'Fixture holiday'}]});assert.deepEqual(x.kinds,['cat','tea']);assert.equal(x.holidays[0].name,'Fixture holiday');assert.equal(x.events[0].id,event.id);assert.equal(C.markers('2026-10-18',{events:m.events()}).events.length,0);m.remove(event.id);assert.deepEqual(m.events(),[]);
});
test('month grids respect leap years and Monday headings; moon approximation follows actual 2026 phases',()=>{
 assert.equal(C.grid(new Date(2024,1,1)).filter(Boolean).length,29);assert.equal(C.grid(new Date(2026,1,1)).filter(Boolean).length,28);assert.equal(C.grid(new Date(2026,9,1)).indexOf('2026-10-01'),3);
 assert.equal(C.moon(C.date('2026-10-10')).name,'New moon');assert.ok(C.moon(C.date('2026-10-26')).illumination>.99);assert.equal(C.moon(C.date('2026-10-26')).name,'Full moon');assert.equal(C.moon(C.date('2026-10-29')).name,'Waning gibbous');
});
test('past scene memories choose one recent same-month/day scene and dismissal persists per day',()=>{
 const scenes=[{id:'old',title:'Kyoto',createdAt:+new Date(2025,9,16,14)},{id:'older',createdAt:+new Date(2024,9,16,10)},{id:'other',createdAt:+new Date(2025,9,17)},{id:'future',createdAt:+new Date(2027,9,16)}];const {store}=fixture(),m=C.create({store});assert.equal(m.memory(scenes,'2026-10-16').title,'Kyoto');m.dismissMemory('old','2026-10-16');assert.equal(C.create({store}).memory(scenes,'2026-10-16'),null);assert.equal(C.memoryFor(scenes,'2026-10-18'),null);
 assert.deepEqual(C.seasonalNotes([{group:'holiday',from:[11,1]}],'2026-11-24'),['The winter holiday set arrives next week.']);assert.deepEqual(C.seasonalNotes([{from:[11,1]}],'2026-11-25'),[]);
});
const googleFixture={items:[{id:'a',summary:'Birthday',start:{date:'2026-10-16'},end:{date:'2026-10-17'}},{id:'b',summary:'Away',start:{date:'2026-10-15'},end:{date:'2026-10-18'}},{id:'c',summary:'Read',start:{dateTime:'2026-10-16T14:00:00Z'},end:{dateTime:'2026-10-16T15:00:00Z'}},{id:'gone',status:'cancelled',start:{date:'2026-10-16'}},{id:'bad',start:{dateTime:'oops'}}]};
test('Google response rows handle all-day, timed, spanning and cancelled events without leaking fields',()=>{
 const rows=C.googleRows(googleFixture);assert.equal(rows.length,3);assert.equal(C.markers('2026-10-16',{google:rows}).google.length,3);assert.deepEqual(C.markers('2026-10-17',{google:rows}).google.map(e=>e.id),['b']);assert.deepEqual(C.markers('2026-10-18',{google:rows}).google,[]);assert.deepEqual(C.googleRows({items:'bad'}),[]);
});
test('Google is opt-in, month cache is memory-only, scope is read-only, failure preserves local calendar and auth errors reconnect',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},calls=[];let time=1000,auths=0,status=200;
 const g=C.createGoogle({clientId:'fixture',storage,now:()=>time,authorize:async(id,scope)=>{auths++;assert.equal(scope,C.SCOPE);return {access_token:'PRIVATE_TOKEN',scope,expires_in:3600};},fetcher:async(url,options)=>{calls.push([url,options]);return {ok:status===200,status,json:async()=>googleFixture};}});
 assert.deepEqual(await g.events(new Date()),[]);assert.equal(auths,0);assert.equal(await g.connect(),true);assert.ok(map.has(C.TOKEN));const d=new Date(2026,9,1);assert.equal((await g.events(d)).length,3);await g.events(d);assert.equal(calls.length,1);assert.ok(calls[0][0].startsWith('https://www.googleapis.com/calendar/v3/calendars/primary/events?'));assert.ok(!calls[0][0].includes('PRIVATE_TOKEN'));assert.equal(calls[0][1].headers.Authorization,'Bearer PRIVATE_TOKEN');assert.equal(new URL(calls[0][0]).searchParams.get('singleEvents'),'true');
 status=503;assert.deepEqual(await g.events(new Date(2026,10,1)),[]);assert.ok(g.connected);status=401;assert.deepEqual(await g.events(new Date(2026,11,1)),[]);assert.equal(g.connected,false);assert.equal(g.reconnect,true);assert.ok(!map.has(C.TOKEN));await g.connect();time+=3600001;assert.deepEqual(await g.events(d),[]);assert.ok(g.reconnect);g.disconnect();assert.equal(g.reconnect,false);
 const off=C.createGoogle({storage,fetcher:()=>assert.fail('unconfigured network')});assert.equal(off.configured,false);assert.equal(await off.connect(),false);
});
test('seven-day forecast uses existing rounded-coordinate fetch and offset-correct date labels',()=>{
 const url=new URL(W.forecastURL({latitude:43.65,longitude:-79.38}));assert.equal(url.searchParams.get('forecast_days'),'7');assert.equal(url.searchParams.get('daily'),'weathercode,temperature_2m_max,temperature_2m_min');
 assert.deepEqual(W.forecast({utc_offset_seconds:14*3600,daily:{time:[Date.UTC(2026,9,15,10)/1000],weathercode:[71],temperature_2m_max:[8],temperature_2m_min:[-2]}}),[{date:'2026-10-16',high:8,low:-2,condition:'snow'}]);assert.deepEqual(W.forecast({}),[]);
});
test('private calendar text, memories, activity and Google tokens cannot enter the decor share boundary',()=>{
 const privateData={calendarEvents:[{title:'PRIVATE_EVENT'}],activityLog:['PRIVATE_LOG'],googleCalendarToken:'PRIVATE_TOKEN',calendarMemories:['PRIVATE_MEMORY']},d=S.shareDecor({...privateData,name:'Room',items:[{id:1,t:'calendar',...privateData}]});assert.ok(!JSON.stringify(d).includes('PRIVATE'));
});
test('native storage never adopts or mirrors a Google OAuth token',async()=>{
 const values=new Map([[C.TOKEN,'PRIVATE_TOKEN'],['lr.example','yes']]),writes=[];const sqlite={createConnection:async()=>{},open:async()=>{},execute:async()=>{},query:async()=>({values:[]}),executeSet:async x=>writes.push(...x.set)};
 const localStorage={get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const scope={window:{Capacitor:{isNativePlatform:()=>true,registerPlugin:name=>name==='App'?{addListener:()=>{}}:sqlite}},localStorage,console,setTimeout,clearTimeout};vm.runInNewContext(fs.readFileSync(require.resolve('../storage.js'),'utf8'),scope);await scope.window.Store.ready;scope.window.Store.set(C.TOKEN,'PRIVATE_TOKEN');await scope.window.Store.flush();assert.ok(writes.some(w=>w.values[0]==='lr.example'));assert.ok(!JSON.stringify(writes).includes('PRIVATE_TOKEN'));
});
test('browser authorization requests only readonly scope and handles popup errors without loading at boot',async()=>{
 let options,request;const scope={window:{google:{accounts:{oauth2:{initTokenClient:o=>{options=o;return {requestAccessToken:r=>{request=r;o.callback({access_token:'fixture',scope:o.scope});}};}}}}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../calendar.js'),'utf8'),scope);const reply=await scope.window.LRCalendar.authorizeGoogle('owner-client',C.SCOPE);assert.equal(reply.access_token,'fixture');assert.equal(options.scope,C.SCOPE);assert.equal(options.include_granted_scopes,false);assert.equal(request.prompt,'consent');
 scope.window.google.accounts.oauth2.initTokenClient=o=>({requestAccessToken:()=>o.error_callback({type:'popup_closed'})});await assert.rejects(scope.window.LRCalendar.authorizeGoogle('owner-client',C.SCOPE));
});
test('Google failures and disconnect races never cache stale or malformed remote data',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},authorize=async()=>({access_token:'fixture',scope:C.SCOPE,expires_in:3600});
 for(const fetcher of [async()=>{throw Error('network');},async()=>({ok:true,json:async()=>{throw Error('bad JSON');}}),async()=>({ok:true,json:async()=>({})})]){const g=C.createGoogle({clientId:'fixture',storage,authorize,fetcher});await g.connect();assert.deepEqual(await g.events(new Date()),[]);assert.ok(g.connected);g.disconnect();}
 let resolve;const g=C.createGoogle({clientId:'fixture',storage,authorize,fetcher:()=>new Promise(r=>resolve=r)});await g.connect();const pending=g.events(new Date());g.disconnect();resolve({ok:true,json:async()=>googleFixture});assert.deepEqual(await pending,[]);assert.equal(g.connected,false);assert.ok(!map.has(C.TOKEN));
});
test('holiday loading for a visible year obeys Live extras and reuses its yearly cache',async()=>{
 const A=require('../atlas.js'),{store}=fixture(),meta={liveExtras:false},calls=[];const a=A.create({store,meta,save:()=>{},fetcher:async url=>{calls.push(url);return {ok:true,json:async()=>[{date:'2027-07-01',name:'Canada Day',localName:'Canada Day'}]};}});
 await a.ensureHolidays(2027);assert.equal(calls.length,0);meta.liveExtras=true;await a.ensureHolidays(2027);assert.deepEqual(a.holidaysFor(2027).map(h=>h.date),['2027-07-01']);await a.ensureHolidays(2027);assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/2027/CA'));meta.liveExtras=false;assert.deepEqual(a.holidaysFor(2027),[]);
});
