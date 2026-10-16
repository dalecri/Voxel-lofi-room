const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../today.js'),W=require('../widgets.js'),R=require('../rituals.js'),A=require('../launcher.js'),LR=require('../room.js');require('../furniture.js');require('../packs/cozy.js');require('../room-tools.js').register(LR);W.register(LR);R.register(LR);require('../shop.js').register(LR);require('../cozy-furniture.js').register(LR);
function fixture(){const values={},store={get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}};return {values,store};}
test('private little tasks add, check, delete and survive a fresh model without joining decor or shares',()=>{
 const {store,values}=fixture(),m=T.create({store,now:()=>100});assert.deepEqual(m.list(),[]);assert.equal(m.add('  PRIVATE_TODO  '),true);const id=m.list()[0].id;m.check(id,true);assert.equal(T.create({store}).list()[0].done,true);
 const copy=m.list();copy[0].text='changed';assert.equal(m.list()[0].text,'PRIVATE_TODO');
 const d=W.shareDecor({...new LR.Room().serialize(),todayTasks:values[T.KEY],weatherDetails:{text:'PRIVATE_WEATHER'}});assert.ok(!JSON.stringify(d).includes('PRIVATE'));m.remove(id);assert.equal(m.list().length,0);assert.equal(m.add(' '),false);
});
test('sky summaries display real chance, temperature and local time, with honest cached or manual fallbacks',()=>{
 const now=new Date(2026,9,16,14,25),at=+new Date(2026,9,16,14),meta={weather:'rain',phase:'day',realtime:true,liveWeather:true,weatherFetchedAt:+now,weatherDetails:{probability:70,probabilityAt:at,temperature:12.6}};
 const sky=T.weather(meta,now);assert.equal(sky.probability,70);assert.equal(sky.temperature,'13°C');assert.ok(sky.time);assert.ok(sky.chance.includes('70% this hour'));assert.equal(sky.stale,false);
 assert.ok(T.weather(meta,new Date(+now+3600000)).chance.startsWith('Last forecast'));
 assert.equal(T.weather({...meta,liveWeather:false},now).probability,null);assert.ok(T.weather({...meta,liveWeather:false},now).chance.includes('Settings'));
 assert.equal(T.weather({...meta,weatherDetails:{temperature:12}},now).stale,false);
 assert.ok(T.weather({...meta,weather:'clear'},now).chance.includes('Drops or flakes'));
 assert.equal(T.weather({...meta,weather:'snow'},now).icon,'❄');assert.ok(T.weather({...meta,weather:'snow'},now).chance.includes('Snowflakes'));
});
test('timer badges use real remaining time, keep ready tea visible and track focus across rooms',()=>{
 const {store}=fixture();let now=1000;const r=R.create({store,now:()=>now});r.light(7,3);r.light(8,'control-center-focus');assert.equal(r.activeFocus.length,2);
 const tea={status:'brewing',endAt:now+134000};let rows=T.timers({tea,focus:r.activeFocus,now});assert.equal(rows[0].value,'2:14');assert.equal(rows[1].value,'25:00 +1');
 now+=134000;rows=T.timers({tea,focus:r.activeFocus,now});assert.equal(rows[0].value,'Ready');assert.ok(rows[1].focus.room===7);r.snuff(7,3);assert.equal(r.activeFocus.length,1);now+=R.FOCUS;r.tick();assert.equal(r.activeFocus.length,0);
 assert.deepEqual(T.timers({tea:{status:'done'},now}),[]);assert.equal(T.countdown(1),'0:01');assert.equal(T.countdown(-1),'0:00');
});
test('furniture previews resolve actual placed variants and do not disable absent tools or mutate room items',()=>{
 const p={id:'typewriter'},items=[{id:1,t:'typewriter',c:2}];assert.deepEqual(A.furniture(p,[],LR.CAT),{id:'typewriter',variant:0,present:false});assert.deepEqual(A.furniture(p,items,LR.CAT),{id:'typewriter',variant:2,present:true});
 assert.equal(A.furniture({id:'settings'},items,LR.CAT),null);assert.equal(A.furniture({furnitureId:'terrarium'},[],LR.CAT).id,'terrarium');assert.equal(A.furniture({id:'tea'},[],LR.CAT).id,'kettle');
 for(const [id,ids] of Object.entries(A.FURNITURE))assert.ok(ids.some(id=>LR.CAT[id]),id);
 assert.deepEqual(items,[{id:1,t:'typewriter',c:2}]);
});
