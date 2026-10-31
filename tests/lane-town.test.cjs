const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../lane.js'),R=require('../room.js');require('../furniture.js');require('../scene.js');require('../japan.js');
for(const f of require('fs').readdirSync(__dirname+'/../packs'))require('../packs/'+f);require('../lane-street.js');require('../shop.js').register(R);
const P=L.projects,day=n=>new Date(Date.UTC(2026,10,1+n)).toISOString().slice(0,10);
test('a garden bed grows over four watered days, once a day, and rain counts',()=>{
 let t=L.cleanTown();assert.equal(P.plant(t,0,'cactus',day(0)),null);
 t=P.plant(t,0,'sunflower',day(0));assert.equal(L.growth(t.beds[0]),0);assert.equal(P.plant(t,0,'lavender',day(0)),null,'one plant per bed');
 t=P.water(t,0,day(0));assert.equal(P.water(t,0,day(0)),null,'once a day');
 t=P.rain(t,day(1));t=P.water(t,0,day(3));assert.equal(L.growth(t.beds[0]),3,'missing a day just pauses it');
 assert.equal(P.clear(t,0),null,'not until it blooms');t=P.water(t,0,day(4));assert.equal(L.growth(t.beds[0]),4);assert.equal(P.water(t,0,day(5)),null,'done growing');
 assert.equal(P.clear(t,0).beds[0],null);assert.deepEqual(P.rain(L.cleanTown(),day(0)),L.cleanTown(),'rain on empty beds changes nothing');
});
test('the bench is mended over three different days and needs a colour for the paint',()=>{
 let t=L.cleanTown();t=P.bench(t,day(0));assert.equal(t.bench.stage,1);assert.equal(P.bench(t,day(0)),null,'one step a day');
 t=P.bench(t,day(1));assert.equal(P.bench(t,day(2)),null,'paint needs a colour');assert.equal(P.bench(t,day(2),'neon'),null);
 t=P.bench(t,day(2),'coral');assert.deepEqual(t.bench,{stage:3,color:'coral',last:day(2)});assert.equal(P.bench(t,day(3),'sage'),null);
});
test('the courtyard gets one chosen piece a day until it has all five',()=>{
 let t=L.cleanTown();for(let k=0;k<5;k++){assert.equal(P.court(t,2,day(k)),null);t=P.court(t,k%2,day(k));assert.equal(P.court(t,0,day(k)),null);}
 assert.deepEqual(t.court.picks,[0,1,0,1,0]);assert.equal(P.court(t,0,day(9)),null);
 for(const step of L.COURT)for(const o of step.options)for(const [piece] of o.items)assert(R.CAT[piece],piece);
});
test('the street shows every stage without collisions, and the neighbours notice',()=>{
 const towns=[L.cleanTown()];let t=L.cleanTown();
 for(let k=0;k<5;k++){t=P.court(t,k%2,day(k));t=P.bench(t,day(k),'blue')||t;for(let i=0;i<3;i++)t=(P.plant(t,i,['sunflower','lavender','strawberry','pumpkin'][(i+k)%4],day(0))?P.water(P.plant(t,i,['sunflower','lavender','strawberry'][i],day(0)),i,day(0)):P.water(t,i,day(k)))||t;towns.push(t);}
 for(const town of towns)for(const phase of ['morning','day','evening'])for(const weather of ['clear','rain']){
  const folks=L.neighbors({phase,weather,town}),{data,actions}=L.interior(R,'street',[],{town,neighbors:folks}),room=new R.Room();assert(room.load(data));
  assert.equal(Object.values(actions).filter(a=>/^(bed:|bench$|court$)/.test(a)).length,L.townPieces(town).length,'every project piece fits');
  assert.equal(Object.values(actions).filter(a=>a.startsWith('talk:')).length,folks.filter(n=>n.place==='street').length,'nobody is crowded out');
  for(const it of room.items.filter(i=>/^lane(bed|bench|court)$/.test(i.t))){const m=new R.Model();R.CAT[it.t].build(m,R.CAT[it.t].vars[it.c],it);assert(m.parts.main.vox.size,it.t+it.c);}
 }
 const done=towns.at(-1);assert.equal(done.bench.stage,3);assert.equal(done.court.picks.length,5);assert(done.beds.every(b=>L.growth(b)===4));
 assert.match(L.neighbors({phase:'day',town:done}).find(n=>n.id==='juniper').doing,/mended bench/);
 assert.match(L.neighbors({phase:'evening',town:done}).find(n=>n.id==='juniper').doing,/courtyard by lantern light/);
 assert.equal(L.neighbors({phase:'evening',town:L.cleanTown()}).find(n=>n.id==='juniper').place,'away');
 assert.match(L.remark('juniper',{town:L.cleanTown()}),/broken/);assert.match(L.remark('juniper',{town:done}),/mended bench/);
 assert.match(L.remark('mallow',{town:done}),/courtyard/);assert.match(L.remark('puddle',{town:towns[1],weather:'rain'}),/watering/);
 assert.equal(L.townNotes(done,day(9)).length,5);
});
test('saved state is cleaned: junk never breaks the street',()=>{
 const t=L.cleanTown({beds:[{plant:'x',planted:'2026-11-01'},{plant:'lavender',planted:'2026-11-01',water:['bad','2026-11-02','2026-11-02']}],bench:{stage:9},court:{picks:[0,7,1,0,0,0,1]}});
 assert.equal(t.beds[0],null);assert.deepEqual(t.beds[1].water,['2026-11-02']);assert.equal(t.beds.length,3);
 assert.deepEqual(t.bench,{stage:3,color:'sage',last:null});assert.deepEqual(t.court.picks,[0,1,0,0,0]);
 let saved={};const m=L.create({store:{get:()=>saved,set:(k,v)=>{saved=v;}},today:()=>'2026-11-01'});m.setTown(P.bench(m.town,'2026-11-01'));assert.equal(m.town.bench.stage,1);
});

test('offline catch-up applies saved rainy days once, respects planting dates, and leaves building projects alone',()=>{
 let town=P.plant(L.cleanTown(),0,'lavender',day(0));town=P.water(town,0,day(0));
 const forecast=Array.from({length:7},(_,n)=>({date:day(n),condition:[1,3,5].includes(n)?'rain':'clear'}));
 const initial=L.tickTown(town,null,{date:day(0),weather:'clear',forecast});
 const result=L.tickTown(initial.town,initial.life,{date:day(6),weather:'clear'});
 assert.equal(L.growth(result.town.beds[0]),4);assert.deepEqual(result.town.beds[0].water,[day(0),day(1),day(3),day(5)]);
 assert.equal(result.life.note.watered,3);assert.deepEqual(result.town.bench,town.bench);assert.deepEqual(result.town.court,town.court);
 assert.deepEqual(L.tickTown(result.town,result.life,{date:day(6),weather:'clear'}),result,'idempotent after reload');
 assert.deepEqual(L.tickTown(result.town,result.life,{date:day(2),weather:'rain'}),result,'clock rollback does nothing');
 const fresh=P.plant(L.cleanTown(),0,'pumpkin',day(6));
 assert.equal(L.growth(L.tickTown(fresh,initial.life,{date:day(6),weather:'clear'}).town.beds[0]),0,'no pre-plant rain');
});
test('fictional showers are deterministic without requests and long absences are bounded',()=>{
 const town=P.plant(L.cleanTown(),0,'sunflower',day(0));
 const one=L.tickTown(town,{last:day(0)},{date:day(30),weather:'clear'});
 assert.deepEqual(one,L.tickTown(town,{last:day(0)},{date:day(30),weather:'clear'}));assert.equal(L.growth(one.town.beds[0]),4);
 let split=L.tickTown(town,{last:day(0)},{date:day(10),weather:L.laneWeather(day(10))});
 split=L.tickTown(split.town,split.life,{date:day(30),weather:'clear'});assert.deepEqual(split.town,one.town);
 const years=L.tickTown(town,{last:day(0)},{date:'2050-01-01'});assert.equal(L.growth(years.town.beds[0]),4);assert(Object.keys(years.life.weather).length<=407);
});
test('a neighbour book waits on a completed bench, survives reload, and can be thanked once',()=>{
 const town=L.cleanTown({bench:{stage:3,color:'coral',last:day(0)}});
 let result=L.tickTown(town,{last:day(0)},{date:day(0),weather:'clear'});
 for(let n=1;n<60&&!result.life.book;n++)result=L.tickTown(result.town,result.life,{date:day(n),weather:'clear'});
 assert(result.life.book);const book=result.life.book;
 result=L.tickTown(result.town,result.life,{date:'2027-06-01',weather:'rain'});assert.equal(result.life.book,book,'no expiry or pile');
 let state={town:result.town,life:result.life};const store={get:()=>state,set:(k,v)=>{state=JSON.parse(JSON.stringify(v));}};
 const m=L.create({store,today:()=>'2027-06-01'});assert.equal(m.life.book,book);assert(m.returnBook());assert(!m.returnBook());m.tick({weather:'clear'});assert.equal(m.life.book,null);
 assert.equal(L.townPieces(town,{book}).find(p=>p.act==='bench').c,7);
 const street=L.interior(R,'street',[],{town,life:{book}});const bench=street.data.items.find(i=>i.t==='lanebench');assert.equal(bench.c,7);assert.equal(street.actions[bench.id],'bench');
 assert.equal(L.tickTown(L.cleanTown(),{last:day(0)},{date:day(100)}).life.book,null,'no book on broken bench');
});
test('old town saves catch up from last visit and retain unrelated progress and private chats',()=>{
 let state={lastVisit:day(0),town:P.plant(L.cleanTown(),0,'strawberry',day(0)),talks:{mallow:{date:day(0),topic:'sign',reply:0}},kept:[day(0)+':letter']};
 const m=L.create({store:{get:()=>state,set:(k,v)=>{state=v;}},today:()=>day(30)});m.tick({weather:'clear'});
 assert.equal(L.growth(m.town.beds[0]),4);assert.equal(m.memory('mallow').topic,'sign');assert.equal(m.kept.length,1);
});
