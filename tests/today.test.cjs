const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../today.js'),W=require('../widgets.js'),A=require('../launcher.js'),LR=require('../room.js');require('../furniture.js');require('../packs/cozy.js');require('../room-tools.js').register(LR);W.register(LR);require('../shop.js').register(LR);require('../cozy-furniture.js').register(LR);
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
test('tea badges count down and stay ready without the retired focus timer',()=>{
 let now=1000;const tea={status:'brewing',endAt:now+134000};let rows=T.timers({tea,now});assert.equal(rows.length,1);assert.equal(rows[0].value,'2:14');
 now+=134000;rows=T.timers({tea,now});assert.equal(rows[0].value,'Ready');
 assert.deepEqual(T.timers({tea:{status:'done'},now}),[]);assert.equal(T.countdown(1),'0:01');assert.equal(T.countdown(-1),'0:00');
});
test('furniture previews resolve actual placed variants and do not disable absent tools or mutate room items',()=>{
 const p={id:'typewriter'},items=[{id:1,t:'typewriter',c:2}];assert.deepEqual(A.furniture(p,[],LR.CAT),{id:'typewriter',variant:0,present:false});assert.deepEqual(A.furniture(p,items,LR.CAT),{id:'typewriter',variant:2,present:true});
 assert.equal(A.furniture({id:'settings'},items,LR.CAT),null);assert.equal(A.furniture({furnitureId:'terrarium'},[],LR.CAT).id,'terrarium');assert.equal(A.furniture({id:'tea'},[],LR.CAT).id,'kettle');
 for(const [id,ids] of Object.entries(A.FURNITURE))assert.ok(ids.some(id=>LR.CAT[id]),id);
 assert.deepEqual(items,[{id:1,t:'typewriter',c:2}]);
});
test('task Fireflies pay exactly three once per day across re-checks and reload; unchecking never claws back',()=>{
 const Shop=require('../shop.js'),{store,values}=fixture();let day='2026-10-16';const wallet=Shop.create({store,today:()=>day}),m=T.create({store,earn:(source,id)=>wallet.earn(source,id)});m.add('Wash my face');const id=m.list()[0].id;
 assert.equal(m.check(id,true),3);assert.equal(wallet.balance,33);assert.equal(m.check(id,true),0);m.check(id,false);assert.equal(wallet.balance,33);assert.equal(m.check(id,true),0);assert.equal(wallet.balance,33);assert.deepEqual(values['lr.fireflyDay'].taskIds,[id]);
 const reloadedWallet=Shop.create({store,today:()=>day}),reloaded=T.create({store,earn:(s,id)=>reloadedWallet.earn(s,id)});reloaded.check(id,false);assert.equal(reloaded.check(id,true),0);assert.equal(reloadedWallet.balance,33);
 day='2026-10-17';reloaded.check(id,false);assert.equal(reloaded.check(id,true),3);assert.equal(reloadedWallet.balance,36);
});
test('task rewards share the 50/day cozy cap with moments, watering and daily rewards, including partial rewards',()=>{
 const Shop=require('../shop.js'),{store}=fixture(),wallet=Shop.create({store,today:()=> '2026-10-16'}),m=T.create({store,earn:(s,id)=>wallet.earn(s,id)});
 wallet.earn('daily');for(let i=0;i<6;i++)wallet.earn('moment');wallet.earn('water','p1');assert.equal(wallet.earnedToday,47);m.add('Walk');m.add('Call');assert.equal(m.check(m.list()[0].id,true),3);assert.equal(m.check(m.list()[1].id,true),0);assert.equal(wallet.balance,80);assert.equal(wallet.earnedToday,50);assert.equal(wallet.earn('water','p2'),0);m.check(m.list()[0].id,false);assert.equal(wallet.balance,80);
 const f=fixture(),w=Shop.create({store:f.store,today:()=> '2026-10-16'});for(let i=0;i<9;i++)w.earn('moment');w.earn('task','old-task');assert.equal(w.earn('task','near-cap'),2);assert.equal(w.earn('task','near-cap'),0);assert.equal(w.balance,80);
});
test('task icons auto-match keywords, allow a small picker, persist and migrate legacy tasks privately',()=>{
 for(const [text,icon] of [['Wash my face','🧼'],['washing dishes','🧼'],['Walk outside','👟'],['Call mum','📞'],['Brush teeth','🪥'],['Something gentle','🌿']])assert.equal(T.iconFor(text),icon);
 const {store,values}=fixture(),m=T.create({store});m.add('Wash my face');const id=m.list()[0].id;assert.equal(m.list()[0].icon,'🧼');assert.equal(m.setIcon(id,'🌙'),true);assert.equal(T.create({store}).list()[0].icon,'🌙');assert.equal(m.setIcon(id,'<script>'),false);assert.equal(m.list()[0].icon,'🌙');
 values[T.KEY]={next:2,items:[{id:'legacy',text:'Walk outside',done:false}]};assert.equal(T.create({store}).list()[0].icon,'👟');assert.ok(!('icon' in values[T.KEY].items[0]));
 const shared=W.shareDecor({...new LR.Room().serialize(),todayTasks:values[T.KEY]});assert.ok(!('todayTasks' in shared));
});
test('journey frames remaining counts positively, advances through dayparts, rests only for a nonempty finished list',()=>{
 const tasks=[{done:false},{done:false},{done:false}];assert.equal(T.journey(tasks).title,'3 little things left!');assert.equal(T.journey(tasks).stage,'morning');tasks[0].done=true;assert.equal(T.journey(tasks).stage,'morning');tasks[1].done=true;assert.equal(T.journey(tasks).title,'1 little thing left!');assert.equal(T.journey(tasks).stage,'afternoon');tasks[2].done=true;assert.equal(T.journey(tasks).title,'All done. Rest now.');assert.equal(T.journey(tasks).pose,'sleep');assert.equal(T.journey(tasks).progress,1);assert.equal(T.journey(tasks).stage,'evening');assert.equal(T.journey([]).done,false);assert.equal(T.journey([]).pose,'idle');
 const {store}=fixture(),m=T.create({store});for(let i=0;i<50;i++)m.add('A small thing');assert.throws(()=>m.add('Too many'),/50/);
});
test('seven optional starter goals preserve the list, deduplicate normalized titles and award only on check',()=>{
 const {store}=fixture();let earned=0;const m=T.create({store,now:()=>123,earn:()=>{earned++;return 3;}});m.add('  BRUSH   TEETH  ');m.add('My own little thing');m.check(m.list()[0].id,true);earned=0;
 assert.equal(T.STARTERS.length,7);assert.equal(m.addStarters(),6);assert.equal(m.list().length,8);assert.equal(m.list()[0].done,true);assert.equal(m.list()[1].text,'My own little thing');assert.equal(earned,0);assert.equal(m.addStarters(),0);
 const restored=T.create({store});for(const s of T.STARTERS){const task=restored.list().find(t=>t.text.toLowerCase()===s.text.toLowerCase());assert.ok(task,s.text);assert.ok(T.ICONS.includes(task.icon));if(s.id!=='teeth')assert.equal(task.icon,s.icon);}
 const water=m.list().find(t=>t.text==='Drink water');assert.equal(m.check(water.id,true),3);assert.equal(earned,1);
 assert.equal(JSON.stringify(W.shareDecor({...new LR.Room().serialize(),todayTasks:store.get(T.KEY)})).includes('My own little thing'),false);
});
test('individual starter picks and the bulk plan obey the existing 50-task limit without replacing tasks',()=>{
 const {store}=fixture(),m=T.create({store});for(let i=0;i<48;i++)m.add('Original task '+i);assert.equal(m.addStarters(['happy']),1);assert.equal(m.list()[48].icon,'😊');assert.equal(m.addStarters(),1);assert.equal(m.list().length,50);assert.equal(m.addStarters(),0);assert.equal(m.list()[0].text,'Original task 0');assert.equal(m.addStarters(['not-a-starter']),0);
});
