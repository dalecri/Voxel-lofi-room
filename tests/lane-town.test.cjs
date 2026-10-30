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
