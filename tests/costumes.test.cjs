const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../costumes.js'), C=require('../companion.js'), L=require('../room.js'), S=require('../shop.js');
require('../packs/seasonal.js');
const voxel=(part,x,y,z)=>[...part.vox].find(([k])=>L.Model.decode(k).join()===[x,y,z].join())?.[1];
function fixture(date=new Date(2026,5,1)) {
  const values={};const store={get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}};
  let now=date,wardrobe;
  const wallet=S.create({store,today:()=> '2026-06-01',onPurchase:item=>{if(item.costume){wardrobe.sync();wardrobe.equip(item.costume);}}});
  const reload=()=>W.create({store,now:()=>now,owns:wallet.owns,seasons:L.SEASONS});
  wardrobe=reload();return {store,values,wallet,wardrobe,reload,date:d=>now=d};
}
test('data-only starter wardrobe has a plain base, seven distinct costumes, and readable faces',()=>{
  assert.equal(W.COSTUMES.length,8);assert.equal(new Set(W.COSTUMES.map(c=>c.id)).size,8);
  const hashes=new Set();
  for(const c of W.COSTUMES){
    assert.deepEqual(JSON.parse(JSON.stringify(c)),c,'all art is serializable data');
    const m=new L.Model();C.definitionFor(c.id).build(m);
    for(const name of ['main',...Object.keys(C.RIG)])assert.ok(m.parts[name],name);
    // Hood art must leave the face and its eyes open in every outfit.
    for(const [x,y,z] of [[1,14,7],[6,14,7],[3,11,7]]){
      const face=[...(y===14 ? m.parts.eyes : m.parts.head).vox].find(([key])=>L.Model.decode(key).join()===[x,y,z].join());assert.equal(face[1],0x3a303a,c.id);
    }
    for(const part of Object.values(m.parts))for(const key of part.vox.keys()){
      const [x,y,z]=L.Model.decode(key);assert.ok(x>=-3 && x<=10 && y>=0 && y<=26 && z>=-1 && z<=11,c.id);
    }
    const vox=new Set([...m.parts.head.vox.keys()].map(k=>L.Model.decode(k).join(','))),queue=[vox.values().next().value];vox.delete(queue[0]);
    for(let k=0;k<queue.length;k++){
      const p=queue[k].split(',').map(Number);
      for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const key=p.map((v,j)=>v+d[j]).join(',');if(vox.delete(key))queue.push(key);}
    }
    assert.equal(vox.size,0,c.id+' has disconnected head/hood art');
    hashes.add(JSON.stringify([...m.parts.head.vox]));
    if(c.layers.badge)assert.ok([...m.parts.main.vox.keys()].some(k=>L.Model.decode(k).join()==='3,6,8'));
  }
  assert.equal(hashes.size,8);
});
test('free selection, locked refusal, exact shop charge, auto-equip, and private reload',()=>{
  const f=fixture();assert.equal(f.wardrobe.selected,'plain');assert.ok(f.wardrobe.owns('automata'));
  assert.equal(f.wardrobe.equip('bear'),false);assert.equal(f.wallet.buy('costume-bear'),false);
  f.wallet.earn('daily');assert.equal(f.wallet.balance,45);
  assert.ok(f.wallet.buy('costume-bear'));assert.equal(f.wallet.balance,5);
  assert.equal(f.wardrobe.selected,'bear');assert.equal(f.wallet.buy('costume-bear'),false);
  assert.equal(f.reload().selected,'bear');assert.ok(f.reload().owns('bear'));
  assert.deepEqual(Object.keys(f.values).filter(k=>k.includes('room')),[]);
  assert.ok(W.COSTUMES.every(c=>W.condition(c).length));
});
test('seasonal pack dates include year wrap; seasonal and streak unlocks remain permanent',()=>{
  const f=fixture();assert.ok(!f.wardrobe.owns('ghost')&&!f.wardrobe.owns('penguin')&&!f.wardrobe.owns('rabbit'));
  for(const date of [new Date(2026,9,1),new Date(2026,10,2)])assert.ok(W.inSeason('halloween',date,L.SEASONS));
  assert.ok(!W.inSeason('halloween',new Date(2026,10,3),L.SEASONS));
  for(const date of [new Date(2026,11,1),new Date(2027,0,7)])assert.ok(W.inSeason('holiday',date,L.SEASONS));
  assert.ok(!W.inSeason('holiday',new Date(2027,0,8),L.SEASONS));
  f.date(new Date(2026,9,15));f.wardrobe.sync();assert.ok(f.wardrobe.owns('ghost'));
  f.date(new Date(2026,11,10));f.wardrobe.sync();assert.ok(f.wardrobe.owns('penguin'));
  f.store.set('lr.dailyStreak',{n:7});f.wardrobe.sync();assert.ok(f.wardrobe.owns('rabbit'));
  f.store.set('lr.dailyStreak',{n:0});f.date(new Date(2027,5,1));
  for(const id of ['ghost','penguin','rabbit'])assert.ok(f.reload().owns(id));
});
test('one new data entry unlocks and builds without a renderer change',()=>{
  const entry={id:'test-leaf',name:'Leaf hood',unlock:{type:'free'},layers:{hood:{color:0x8aaa77,shapes:[{shape:'box',at:[3,20,3],size:[2,2,2],color:0x658855}]},badge:{shapes:[{shape:'box',at:[3,6,8],size:[2,2,1],color:0x658855}]}}};
  W.COSTUMES.push(entry);
  try{const f=fixture();assert.ok(f.wardrobe.equip(entry.id));const m=new L.Model();C.definitionFor(entry.id).build(m);assert.ok(m.parts.head.vox.size);assert.equal(f.reload().selected,entry.id);}
  finally{W.COSTUMES.pop();}
});
test('merchant reserves one of three wares for an unowned costume',()=>{
  const f=fixture(),M=require('../life.js').merchant({store:f.store,today:()=> '2026-06-01',owns:f.wallet.owns,catalog:S.catalog,random:()=>.2});
  M.tick(200,true,1);assert.equal(M.wares.length,3);assert.equal(new Set(M.wares).size,3);assert.ok(S.catalog.find(c=>c.id===M.wares[0]).costume);
});

test('legacy selection migrates once to four identical private slots, preserving exact art',()=>{
  for(const c of W.COSTUMES){
    const f=fixture();f.store.set(W.KEY,{selected:c.id,owned:[c.id]});const wardrobe=f.reload();
    assert.deepEqual(wardrobe.slots,W.slotsFor(c.id));
    assert.ok(!('selected' in f.values[W.KEY]));assert.deepEqual(f.reload().slots,wardrobe.slots);
    const old=new L.Model(),mixed=new L.Model();C.definitionFor(c.id).build(old);C.definitionForSlots(wardrobe.slots).build(mixed);
    for(const part of Object.keys(old.parts))assert.deepEqual([...mixed.parts[part].vox],[...old.parts[part].vox]);
  }
});
test('slot composition uses the chosen hood, suit and badge, while bare is exactly the base rig',()=>{
  const f=fixture();f.store.set(W.KEY,{owned:['bear','cat']});const w=f.reload();
  assert.ok(w.equipSlot('hood','bear'));assert.ok(w.equipSlot('suit','cat'));assert.ok(w.equipSlot('badge','automata'));
  const mixed=new L.Model(),bear=new L.Model(),cat=new L.Model(),base=new L.Model(),bare=new L.Model();
  C.definitionForSlots(w.slots).build(mixed);C.definitionFor('bear').build(bear);C.definitionFor('cat').build(cat);
  assert.deepEqual([...mixed.parts.head.vox],[...bear.parts.head.vox]);
  assert.deepEqual([...mixed.parts.leftleg.vox],[...cat.parts.leftleg.vox]);
  assert.equal(voxel(mixed.parts.main,3,6,8)&0xffffff,0x91d9d0);
  assert.deepEqual(f.reload().slots,w.slots);const detached=w.slots;detached.hood='frog';assert.equal(w.slots.hood,'bear');
  for(const slot of W.SLOTS)assert.ok(w.equipSlot(slot,'plain'));
  C.definitionFor('plain').build(base);C.definitionForSlots(w.slots).build(bare);
  for(const part of Object.keys(base.parts))assert.deepEqual([...bare.parts[part].vox],[...base.parts[part].vox]);
});
test('locked, unknown and missing layers cannot equip a slot; shop purchases unlock all layers',()=>{
  const f=fixture(),before=f.wardrobe.slots;
  for(const slot of W.SLOTS)assert.equal(f.wardrobe.equipSlot(slot,'bear'),false);
  assert.equal(f.wardrobe.equipSlot('hood','missing'),false);assert.equal(f.wardrobe.equipSlot('missing','automata'),false);
  assert.equal(f.wardrobe.equipSlot('accessory','automata'),false);assert.deepEqual(f.wardrobe.slots,before);
  f.wallet.earn('daily');assert.ok(f.wallet.buy('costume-bear'));
  assert.deepEqual(f.wardrobe.slots,W.slotsFor('bear'));
  for(const slot of ['hood','suit','badge'])assert.ok(f.wardrobe.equipSlot(slot,'bear'));
});
test('data-only hand accessories compose into the arm and remain attached to its pose rig',()=>{
  const entry={id:'test-mug',name:'Tea cup',unlock:{type:'free'},layers:{accessory:{shapes:[{shape:'box',part:'rightarm',at:[8,4,6],size:[2,2,2],color:0xaabbcc}]}}};
  W.COSTUMES.push(entry);
  try{const f=fixture();assert.ok(f.wardrobe.equipSlot('accessory',entry.id));const m=new L.Model();C.definitionForSlots(f.wardrobe.slots).build(m);assert.equal(voxel(m.parts.rightarm,8,4,6),0xaabbcc);assert.equal(voxel(m.parts.head,8,4,6),undefined);}
  finally{W.COSTUMES.pop();}
});
