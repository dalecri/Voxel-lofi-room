const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../lane.js'),R=require('../room.js');require('../furniture.js');require('../scene.js');require('../packs/doors.js');require('../packs/seasonal.js');require('../lane-street.js');
const S=require('../shop.js');S.register(R);
const gifts=S.allCatalog.filter(i=>i.piece&&!i.costume&&R.CAT[i.piece]).map(i=>i.id).sort();
const days=n=>Array.from({length:n},(_,i)=>new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10));
test('two or three discoveries a day, seeded by the date, with visitors as an occasional treat',()=>{
 let visitors=0;
 for(const d of days(365)){const f=L.discoveries({date:d,gifts});assert(f.length===2||f.length===3,d);assert.equal(new Set(f.map(x=>x.kind)).size,f.length,'no repeats in a day');
  assert.deepEqual(f,L.discoveries({date:d,gifts}),'same day, same finds');visitors+=f.some(x=>x.kind==='visitor');
  for(const x of f)assert(x.id.startsWith(d+':')&&x.title&&x.at,d);}
 assert(visitors>30&&visitors<120,visitors);
 assert(!days(60).some(d=>L.discoveries({date:d}).some(x=>x.kind==='visitor')),'no gifts, no visitor');
 assert.deepEqual(L.discoveries({date:'nope'}),[]);
});
test('blooms follow the season and the hemisphere; parcels go to a neighbour who can receive them',()=>{
 const bloom=(date,south)=>{for(let k=0;k<20;k++){const d=new Date(Date.UTC(+date.slice(0,4),+date.slice(5,7)-1,1+k)).toISOString().slice(0,10);const b=L.discoveries({date:d,south}).find(x=>x.kind==='bloom');if(b)return b.flower;}};
 assert.equal(bloom('2026-04-01'),'crocus');assert.equal(bloom('2026-07-01'),'sunflower');assert.equal(bloom('2026-10-01'),'aster');assert.equal(bloom('2026-01-01'),'snowdrop');
 assert.equal(bloom('2026-07-01',true),'snowdrop');
 for(const d of days(90))for(const x of L.discoveries({date:d}).filter(x=>x.kind==='parcel'))assert(['mallow','juniper'].includes(x.to));
});
test('a visitor offers the first piece you don’t own yet, and a jar of fireflies once you own everything',()=>{
 const d=days(200).map(x=>L.discoveries({date:x,gifts}).find(f=>f.kind==='visitor')).find(Boolean);
 const first=L.giftFor(d,()=>false);assert(gifts.includes(first));
 const next=L.giftFor(d,id=>id===first);assert(next&&next!==first);
 assert.equal(L.giftFor(d,()=>true),null);
});
test('the street shows today’s finds; letters and parcels leave once taken, the flower and visitor stay without their sparkle',()=>{
 const d=days(400).map(x=>L.discoveries({date:x,gifts})).find(f=>f.length===3&&f.some(x=>x.kind==='visitor'));
 const finds=d.map(x=>x.kind==='visitor'?{...x,gift:S.allCatalog.find(i=>i.id===L.giftFor(x))?.piece}:x);
 const build=(found,carrying)=>{const {data,actions}=L.interior(R,'street',[],{finds,found,carrying,neighbors:L.neighbors({phase:'day',weather:'rain'})}),room=new R.Room();assert(room.load(data));return {room,actions};};
 const fresh=build([],null);for(const x of finds)assert(Object.values(fresh.actions).includes('find:'+x.id),x.kind);
 for(const it of fresh.room.items.filter(i=>/^lane(letter|bloom|parcel|visitor)$/.test(i.t))){assert(it.on,it.t);const m=new R.Model();R.CAT[it.t].build(m,R.CAT[it.t].vars[it.c||0],it);assert(m.parts.main.vox.size);}
 const done=build(finds.map(x=>x.id),null);
 for(const x of finds){const left=done.room.items.filter(i=>done.actions[i.id]==='find:'+x.id);
  if(x.kind==='letter'||x.kind==='parcel')assert.equal(left.length,0,x.kind);
  if(x.kind==='visitor'){assert.equal(left.length,1);assert.equal(left[0].on,false);}}
 const p=finds.find(x=>x.kind==='parcel');if(p)assert(!Object.values(build([],p.id).actions).includes('find:'+p.id),'a carried parcel is in your paws, not on the street');
});
test('the model keeps today’s finds, resets tomorrow, and keeps opened letters',()=>{
 let saved={},date='2026-11-08';const store={get:()=>saved,set:(k,v)=>{saved=v;}};const m=L.create({store,today:()=>date});
 m.carry('2026-11-08:parcel');assert.equal(m.today().carrying,'2026-11-08:parcel');
 m.found('2026-11-08:parcel');assert.equal(m.today().carrying,null);m.found('2026-11-08:letter');m.found('2026-11-08:letter');
 assert.deepEqual(m.today().found,['2026-11-08:parcel','2026-11-08:letter']);assert.deepEqual(m.kept,['2026-11-08:letter']);
 date='2026-11-09';assert.deepEqual(m.today(),{date,found:[],carrying:null});assert.deepEqual(m.kept,['2026-11-08:letter']);
 const kept=L.keptLetters(m.kept);assert.equal(kept.length,1);assert(kept[0].subject&&kept[0].body&&kept[0].from);
 saved={day:{date:'junk',found:5},kept:[3,'x','2026-11-08:letter']};assert.deepEqual(m.today().found,[]);assert.deepEqual(m.kept,['2026-11-08:letter']);
});
test('shop gifts are free, once, and only for real items',()=>{
 let data={'lr.fireflies':10};const store={get:(k,d)=>k in data?data[k]:d,set:(k,v)=>{data[k]=v;}};const bought=[];
 const shop=S.create({store,today:()=>'2026-11-08',onPurchase:i=>bought.push(i.id)});
 assert(shop.gift('ufo'));assert(shop.owns('ufo'));assert.equal(shop.balance,10);assert(!shop.gift('ufo'));assert(!shop.gift('nope'));assert.deepEqual(bought,['ufo']);
});
