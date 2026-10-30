const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../lane.js');
const where=(phase,weather)=>Object.fromEntries(L.neighbors({phase,weather}).map(n=>[n.id,n]));
test('routines: Mallow opens the shop in the morning, Juniper reads outside in the afternoon, Puddle only comes with the rain',()=>{
 assert.equal(where('morning','clear').mallow.place,'street');assert.match(where('morning','clear').mallow.doing,/opening/);
 for(const p of ['day','evening','night'])assert.equal(where(p,'clear').mallow.place,'shop');
 assert.equal(where('day','clear').juniper.place,'street');assert.match(where('day','clear').juniper.doing,/reading under the tree/);
 assert.match(where('day','rain').juniper.doing,/porch/,'Juniper keeps dry');
 assert.equal(where('evening','clear').juniper.place,'away');assert.equal(where('night','clear').juniper.place,'away');
 for(const p of ['morning','day','evening','night']){assert.equal(where(p,'clear').puddle.place,'away');assert.equal(where(p,'rain').puddle.place,'street');assert.equal(where(p,'storm').puddle.place,'street');}
 assert.match(where('day','snow').puddle.doing,/snow/);
 // Everyone on the street has a figure and a spot, and no two share a cell.
 for(const p of ['morning','day','evening','night'])for(const w of ['clear','rain']){const on=L.neighbors({phase:p,weather:w}).filter(n=>n.place==='street');assert(on.every(n=>n.piece&&n.at));assert.equal(new Set(on.map(n=>n.at.join())).size,on.length);}
});
test('personalities: each neighbour has a voice and every topic has two answers with a reply and a memory',()=>{
 for(const [id,N] of Object.entries(L.NEIGHBORS)){assert(N.name&&N.role&&N.about&&N.hello&&N.missed&&N.again,id);assert(N.topics.length>=3,id);
  for(const t of N.topics){assert(t.ask.endsWith('?'),t.id);assert.equal(t.replies.length,2);for(const r of t.replies)assert(r.every(x=>typeof x==='string'&&x.length>2),t.id);}
  assert.equal(new Set(N.topics.map(t=>t.id)).size,N.topics.length);}
});
test('conversations remember yesterday: the answer comes back first, the question changes, the same day just gets a nod',()=>{
 const first=L.talk('mallow',{date:'2026-10-30'});assert.equal(first.remembered,false);assert.equal(first.lines[0],L.NEIGHBORS.mallow.hello);assert.equal(first.replies.length,2);
 const a=L.answer('mallow',first.topic,0,'2026-10-30');assert(a.line);assert.deepEqual(a.record,{date:'2026-10-30',topic:first.topic,reply:0});
 const same=L.talk('mallow',{date:'2026-10-30',memory:a.record});assert.deepEqual(same.replies,[]);assert.equal(same.lines[0],L.NEIGHBORS.mallow.again);
 const next=L.talk('mallow',{date:'2026-10-31',memory:a.record});assert(next.remembered);
 assert.equal(next.lines[0],L.NEIGHBORS.mallow.topics.find(t=>t.id===first.topic).replies[0][2]);assert.notEqual(next.topic,first.topic,'a new question tomorrow');
 const other=L.talk('mallow',{date:'2026-10-31',memory:{...a.record,reply:1}});assert.notEqual(other.lines[0],next.lines[0],'they remember which answer you gave');
 const later=L.talk('mallow',{date:'2026-11-04',memory:a.record});assert.equal(later.remembered,false);assert.equal(later.lines[0],L.NEIGHBORS.mallow.missed);
 assert.equal(L.talk('nobody',{date:'2026-10-30'}),null);assert.equal(L.answer('mallow','nope',0,'2026-10-30'),null);
 // Questions are seeded: everyone gets the same one on the same day.
 assert.equal(L.talk('juniper',{date:'2026-11-02'}).topic,L.talk('juniper',{date:'2026-11-02'}).topic);
});
test('the model keeps one small record per neighbour and ignores junk',()=>{
 let saved={talks:{mallow:{date:'bad',topic:1,reply:'x'},stranger:{date:'2026-10-30',topic:'a',reply:0}}};
 const store={get:()=>saved,set:(k,v)=>{saved=v;}};const m=L.create({store,today:()=>'2026-10-30'});
 assert.equal(m.memory('mallow'),null);assert.equal(m.memory('stranger'),null);
 m.remember('juniper',{date:'2026-10-30',topic:'pick',reply:1,extra:'no'});assert.deepEqual(m.memory('juniper'),{date:'2026-10-30',topic:'pick',reply:1});
 m.remember('stranger',{date:'2026-10-30',topic:'x',reply:0});assert.equal(saved.talks.stranger,undefined);
});
