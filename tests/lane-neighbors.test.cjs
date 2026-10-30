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
test('the model migrates conversation records and ignores junk',()=>{
 let saved={talks:{mallow:{date:'bad',topic:1,reply:'x'},stranger:{date:'2026-10-30',topic:'a',reply:0}}};
 const store={get:()=>saved,set:(k,v)=>{saved=v;}};const m=L.create({store,today:()=>'2026-10-30'});
 assert.equal(m.memory('mallow'),null);assert.equal(m.memory('stranger'),null);
 m.remember('juniper',{date:'2026-10-30',topic:'pick',reply:1,extra:'no'});assert.deepEqual(m.memory('juniper'),{date:'2026-10-30',topic:'pick',reply:1,warmth:1,history:[{date:'2026-10-30',topic:'pick',reply:1}],stories:{}});
 m.remember('stranger',{date:'2026-10-30',topic:'x',reply:0});assert.equal(saved.talks.stranger,undefined);
});

const dateAt=n=>new Date(Date.UTC(2026,0,1+n)).toISOString().slice(0,10);
function fixture(initial={}){let saved=structuredClone(initial);return {model:L.create({store:{get:()=>saved,set:(k,v)=>{saved=structuredClone(v);}},today:()=>dateAt(0)}),get saved(){return saved;}};}
function chatDay(model,id,n,reply=0){const date=dateAt(n),chat=L.talk(id,{date,memory:model.memory(id)});assert(chat.ask);const response=L.answer(id,chat.topic,reply,date);model.remember(id,response.record);return {chat,response};}

test('eight weeks of conversation: unlocks personal topics over weeks, exhausts fresh topics before repeating, and finishes each story once',()=>{
 for(const id of Object.keys(L.NEIGHBORS)){
  const {model}=fixture(),seen=new Set(),storySteps=[];
  for(let n=0;n<70;n++){
   const prior=model.memory(id),warmth=prior?.warmth||0;
   const {chat}=chatDay(model,id,n,n%2),topic=L.NEIGHBORS[id].topics.find(t=>t.id===chat.topic);
   assert((topic.warmth||0)<=warmth);
   if(topic.story)storySteps.push(topic.step);
   else if(seen.has(topic.id))assert(L.NEIGHBORS[id].topics.filter(t=>!t.story&&(t.warmth||0)<=warmth).every(t=>seen.has(t.id)),'unseen eligible topic must win');
   if([7,14,21,28].includes(n))assert.equal(topic.warmth,n,'new personal subject opens on the next chat');
   seen.add(topic.id);assert.equal(model.memory(id).warmth,n+1);
  }
  assert.deepEqual(storySteps,[0,1,2]);
  assert.equal(seen.size,L.NEIGHBORS[id].topics.length,'all authored topics reachable');
  assert.equal(model.memory(id).history.length,48,'bounded choice memory');
 }
});

test('warmth cannot be farmed by repeat answers or clock rollback and never decays during absence',()=>{
 const {model}=fixture();const {response}=chatDay(model,'mallow',0);
 model.remember('mallow',response.record);assert.equal(model.memory('mallow').warmth,1);
 model.remember('mallow',{...response.record,date:'2025-12-31'});assert.equal(model.memory('mallow').warmth,1);
 assert.equal(L.talk('mallow',{date:'2025-12-31',memory:model.memory('mallow')}).ask,null);
 for(const rec of [{date:dateAt(1),topic:'spare-cup',reply:0},{date:dateAt(1),topic:'music-box:2',reply:0},{date:'bad',topic:'sign',reply:0},{date:dateAt(1),topic:'sign',reply:9}])model.remember('mallow',rec);
 assert.equal(model.memory('mallow').warmth,1);
 chatDay(model,'mallow',80);assert.equal(model.memory('mallow').warmth,2);
 assert.equal(model.memory('juniper'),null,'relationships are separate');
});

test('three-visit stories resume after missing weeks and retain the chosen branch across reloads',()=>{
 for(const id of Object.keys(L.NEIGHBORS))for(const reply of [0,1]){
  let {model}=fixture();for(let d=0;d<3;d++)chatDay(model,id,d);
  const first=chatDay(model,id,3,reply);assert.equal(first.chat.story.chapter,1);
  model=fixture({talks:{[id]:model.memory(id)}}).model;
  const next=L.talk(id,{date:dateAt(30),memory:model.memory(id)});
  assert.equal(next.story.chapter,2);
  assert.equal(next.lines[0],L.NEIGHBORS[id].topics.find(t=>t.id===first.chat.topic).replies[reply][2]);
  chatDay(model,id,30,reply);const last=chatDay(model,id,60,reply);assert.equal(last.chat.story.chapter,3);
  const after=L.talk(id,{date:dateAt(90),memory:model.memory(id)});assert.equal(after.story,null);
  assert.equal(after.lines[0],L.NEIGHBORS[id].topics.find(t=>t.id===last.chat.topic).replies[reply][2]);
 }
});

test('old saves migrate conservatively, malformed records are discarded, older choices survive absence',()=>{
 const {model}=fixture({talks:{mallow:{date:dateAt(0),topic:'teapot',reply:1},juniper:{date:dateAt(0),topic:'not-real',reply:0}}});
 assert.equal(model.memory('mallow').warmth,1);assert.equal(model.memory('juniper'),null);
 chatDay(model,'mallow',1);
 const later=L.talk('mallow',{date:dateAt(40),memory:model.memory('mallow')});
 assert(later.remembered);assert(later.lines.some(line=>line.includes('Send it back')),'choice from before the last conversation is remembered');
 assert.equal(L.answer('mallow','teapot',0,'nonsense'),null);
});
