const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('../habits.js'),C=require('../calendar.js');
function memStore(){const db=new Map();return {db,get:(k,d)=>structuredClone(db.has(k)?db.get(k):d),set:(k,v)=>db.set(k,structuredClone(v)),del:k=>db.delete(k)};}
const at=(y,m,d,h=14)=>new Date(y,m-1,d,h).getTime();
function withDays(n,from=new Date(2026,0,1)){const days={};for(let i=0;i<n;i++){const d=new Date(from);d.setDate(d.getDate()+i);days[H.day(d)]=true;}return {id:'h',name:'x',c:0,room:null,item:null,created:'2026-01-01',days};}

test('stage thresholds at 0/1/3/4/9/10/20/21 check-ins',()=>{
  assert.deepEqual([0,1,3,4,9,10,20,21].map(n=>H.stage(withDays(n))),[0,1,1,2,2,3,3,4]);
});
test('resting starts at 7 days since the last check-in and the stage floors at 0',()=>{
  const h=withDays(5,new Date(2026,2,1));// last check-in March 5
  assert.equal(H.resting(h,new Date(2026,2,11,9)),false);// 6 days
  assert.equal(H.resting(h,new Date(2026,2,12,9)),true);// 7 days
  assert.equal(H.displayStage(h,new Date(2026,2,12)),1);
  const empty=withDays(0);assert.equal(H.resting(empty,new Date(2027,0,1)),false);assert.equal(H.displayStage(empty,new Date(2027,0,1)),0);
  const one=withDays(1,new Date(2026,0,1));assert.equal(H.displayStage(one,new Date(2026,5,1)),0);
});
test('check-in is idempotent: one day entry and one activity event',()=>{
  const store=memStore(),now=()=>at(2026,10,21),m=H.create({store,now}),cal=C.create({store,now:()=>new Date(now())});
  const h=m.add({name:'  Stretch  ',c:1});assert.equal(h.name,'Stretch');assert.match(h.id,/^habit-/);
  const remember=r=>{if(r.added)cal.append('habit',{date:r.date,id:r.date+':'+h.id});};
  const a=m.checkIn(h.id);remember(a);assert.equal(a.added,true);assert.equal(a.before,0);assert.equal(a.after,1);
  const b=m.checkIn(h.id);assert.equal(b.added,false);assert.equal(cal.append('habit',{date:b.date,id:b.date+':'+h.id}),false);
  assert.deepEqual(Object.keys(m.get(h.id).days),['2026-10-21']);
  const rows=store.get(C.LOG,[]);assert.deepEqual(rows.find(r=>r.date==='2026-10-21').events,['habit']);
  assert.deepEqual(store.get(H.KEY).habits[0].days,{'2026-10-21':true});
});
test('a seventh habit is refused with the shelf message',()=>{
  const m=H.create({store:memStore(),now:()=>at(2026,10,21)});
  for(let i=0;i<6;i++)m.add({name:'Habit '+i});
  assert.equal(m.full,true);assert.throws(()=>m.add({name:'Seventh'}),{message:H.FULL});assert.equal(m.list().length,6);
  assert.throws(()=>H.create({store:memStore(),now:Date.now}).add({name:'   '}),/name/);
});
test('heatmap is 15 Monday-first weeks ending with today, no future cells filled',()=>{
  const now=new Date(2026,9,21,15);// a Wednesday
  const h=withDays(0);h.days['2026-10-21']=true;h.days['2026-10-20']=true;h.days['2026-10-23']=true;h.days['2026-07-13']=true;
  const weeks=H.heatmap(h,now);assert.equal(weeks.length,15);assert.ok(weeks.every(c=>c.length===7));
  for(const col of weeks)assert.equal(new Date(col[0].date+'T12:00').getDay(),1);
  const last=weeks.at(-1);assert.equal(last[2].date,'2026-10-21');assert.equal(last[2].today,true);
  assert.equal(weeks.flat().filter(c=>c.today).length,1);
  assert.deepEqual(last.slice(3).map(c=>[c.future,c.checked]),[[true,false],[true,false],[true,false],[true,false]]);
  assert.equal(last[1].checked,true);assert.equal(weeks[0][0].date,'2026-07-13');assert.equal(weeks[0][0].checked,true);
  assert.equal(weeks.flat().filter(c=>c.future).length,4);
});
test('malformed stored state loads without throwing and drops bad entries',()=>{
  for(const bad of [null,'nope',42,[],{habits:'x'},{habits:[null,1,'a']}]){const s=memStore();s.set(H.KEY,bad);assert.deepEqual(H.create({store:s}).list(),[]);}
  const s=memStore();s.set(H.KEY,{habits:[
    {id:'a',name:'Read',c:9,room:1,item:4,days:{'2026-10-01':true,'oops':true,'2026-10-02':'yes'}},
    {id:'a',name:'Dup',days:{}},{id:'b',name:'   ',days:{}},{name:'No id'},{id:'c',name:'x'.repeat(40),room:2,item:null,days:[1]},
  ]});
  const list=H.create({store:s}).list();
  assert.deepEqual(list.map(h=>h.id),['a','c']);assert.equal(list[0].c,0);assert.deepEqual(list[0].days,{'2026-10-01':true});assert.equal(list[0].created,'2026-10-01');
  assert.equal(list[1].name.length,24);assert.equal(list[1].room,null);assert.deepEqual(list[1].days,{});
  const broken={get(){throw Error('boom');},set(){}};assert.doesNotThrow(()=>H.create({store:broken}));
});
test('undo removes only today and bindings follow pots and rooms',()=>{
  let t=at(2026,10,20);const m=H.create({store:memStore(),now:()=>t}),h=m.add({name:'Walk'});
  m.checkIn(h.id);t=at(2026,10,21);m.checkIn(h.id);
  assert.equal(m.undoToday(h.id),true);assert.deepEqual(Object.keys(m.get(h.id).days),['2026-10-20']);assert.equal(m.undoToday(h.id),false);
  assert.deepEqual(m.growth(1,99),{stage:2,resting:false,c:null});
  m.bind(h.id,1,7);assert.equal(m.forItem(1,7).id,h.id);assert.equal(m.growth(1,7).stage,1);
  assert.equal(m.reconcile(1,{get:id=>id===7?{t:'habitpot'}:null}),false);
  assert.equal(m.reconcile(1,{get:()=>null}),true);assert.equal(m.get(h.id).item,null);assert.equal(Object.keys(m.get(h.id).days).length,1);
  m.bind(h.id,2,3);assert.equal(m.detachRoom(2),true);assert.equal(m.get(h.id).room,null);
  m.bind(h.id,1,5);assert.equal(m.detach(1,5),true);
  assert.equal(m.retire(h.id).name,'Walk');assert.equal(m.list().length,0);
});
