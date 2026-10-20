const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const G=require('../focus-garden.js'),R=require('../rituals.js'),LR=require('../room.js'),W=require('../widgets.js');require('../furniture.js');require('../japan.js');require('../cozy-furniture.js').register(LR);
function fixture(){let time=Date.UTC(2026,9,17,14);const db=new Map(),store={get:(k,d)=>structuredClone(db.get(k)??d),set:(k,v)=>db.set(k,structuredClone(v)),del:k=>db.delete(k)},now=()=>time;const rituals=R.create({store,now}),garden=G.create({store,rituals,now}),room=new LR.Room();room.items=[];const bed=room.add(room.make('focusgarden',{x:3,z:3}));return {store,db,rituals,garden,room,bed,now,advance:n=>time+=n};}
test('garden stages use exact quarter-session thresholds and reload resumes the shared ritual deadline',()=>{
 assert.deepEqual([0,.24999,.25,.49999,.5,.74999,.75,.99999,1].map(G.stageOf),[0,0,1,1,2,2,3,3,4]);const f=fixture(),s=f.garden.start(1,f.bed.id,15);assert.equal(f.garden.active.stage,0);assert.ok(f.garden.settle(f.room,1,LR));const plant=f.garden.active.plant;assert.equal(f.room.get(plant).p,f.bed.id);
 f.advance(225000);assert.equal(f.garden.growth(1,plant).stage,1);const restoredR=R.create({store:f.store,now:f.now}),restored=G.create({store:f.store,rituals:restoredR,now:f.now});assert.equal(restored.active.end,s.end);assert.equal(restored.active.remaining,675000);assert.equal(restoredR.activeFocus.length,1);assert.equal(restored.start(1,99,50).id,s.id);
 f.advance(675000);restoredR.tick();assert.equal(restored.tick().length,1);assert.equal(restored.state.totalBlooms,1);assert.equal(restored.growth(1,plant).stage,4);assert.deepEqual(restored.tick(),[]);assert.equal(restoredR.activeFocus.length,0);assert.equal(LR.CAT.focuscandle,undefined);
});
test('fourth completed session earns exactly one normal-care cherry sapling; incomplete sessions pocket without wilt or counters',()=>{
 const f=fixture();f.garden.start(1,f.bed.id,25);f.garden.settle(f.room,1,LR);const plant=f.garden.active.plant;f.advance(200000);const ended=f.garden.pocket();assert.equal(ended.completed,false);f.garden.settle(f.room,1,LR);assert.equal(f.room.get(plant),null);assert.equal(f.garden.state.totalBlooms,0);assert.equal(f.rituals.activeFocus.length,0);
 for(let i=1;i<=4;i++){f.garden.start(1,f.bed.id,15);f.garden.settle(f.room,1,LR);f.advance(900000);f.rituals.tick();const [s]=f.garden.tick();assert.equal(s.blossomDue,i===4);f.garden.settle(f.room,1,LR);}
 assert.equal(f.garden.state.totalBlooms,4);assert.equal(f.garden.state.blossomsGrown,1);assert.equal(f.room.items.filter(it=>it.t==='focuscherry').length,1);f.garden.settle(f.room,1,LR);assert.equal(f.room.items.filter(it=>it.t==='focuscherry').length,1);assert.equal(LR.CAT.focuscherry.tap,'water');
 const last=f.garden.state.sessions.at(-1),label=f.garden.label(1,last.plant);assert.equal(label.minutes,15);assert.equal(label.completed,true);assert.ok(label.date);assert.ok(!('failures' in f.garden.state));
});
test('timed plants bypass watering/wilt without changing ordinary plant growth',()=>{
 const f=fixture();f.garden.start(1,f.bed.id,15);f.garden.settle(f.room,1,LR);const normal=f.room.add(f.room.make('plant',{x:0,z:0}));
 const scope={window:{},Date:class extends Date{constructor(...a){super(...(a.length?a:[f.now()]))}static now(){return f.now()}},Math,console,setTimeout};vm.runInNewContext(fs.readFileSync(require.resolve('../care.js'),'utf8'),scope);
 const view={careVis:new Map(),cozy:.5},A={room:f.room,view,CAT:LR.CAT,Sound:{},store:f.store,meta:{},roomId:()=>1,today:()=>new Date(f.now()).toISOString().slice(0,10),dateKey:d=>d.toISOString().slice(0,10),discover(){},growthOverride:it=>f.garden.growth(1,it.id)};const care=scope.window.LRCare(A);care.tick(0);const id=f.garden.active.plant;assert.equal(view.careVis.get(id).stage,0);assert.equal(care.kindOf(f.room.get(id)),null);const days=f.store.get('lr.care',{});care.flush();const before=f.store.get('lr.care')[1].items[normal.id].days;
 f.advance(53*3600000);f.rituals.tick();f.garden.tick();care.tick(0);assert.equal(view.careVis.get(id).stage,4);assert.equal(view.careVis.get(id).sag,undefined);assert.equal(view.careVis.get(normal.id).sag,.86);care.flush();assert.equal(f.store.get('lr.care')[1].items[normal.id].days,before);assert.equal(f.store.get('lr.care')[1].items[id],undefined);
});
test('garden art builds all variants, growing parts are staged, and room share strips session labels/history',()=>{
 for(const type of ['focusgarden','focusbloom','focuscherry'])for(const vars of LR.CAT[type].vars){const m=new LR.Model();LR.CAT[type].build(m,vars,{});assert.ok(m.parts.main.vox.size);if(type==='focusbloom')for(let i=1;i<=4;i++)assert.ok(m.parts['growth'+i].vox.size);}
 const f=fixture();f.garden.start(1,f.bed.id,15);f.garden.settle(f.room,1,LR);const raw=JSON.stringify(W.shareDecor({...f.room.serialize(),focusGarden:f.garden.state,focusRituals:f.store.get('lr.focusRituals')}));assert.ok(!raw.includes('sessions'));assert.ok(!raw.includes('minutes'));assert.ok(!raw.includes('end'));assert.ok(raw.includes('focusgarden'));
});

test('all focus presets share the rituals deadline and interrupted history writes cannot strand an active timer',()=>{
 for(const minutes of G.PRESETS){const f=fixture(),s=f.garden.start(1,1,minutes);assert.equal(s.end-s.start,minutes*60000);assert.equal(f.rituals.activeFocus[0].session,s.id);}
 const f=fixture();f.rituals.light(1,1,{minutes:50,kind:'garden',session:'orphan'});const recovered=G.create({store:f.store,rituals:f.rituals,now:f.now});assert.equal(f.rituals.activeFocus.length,0);assert.equal(recovered.active,null);assert.ok(recovered.start(1,1,15));
});

test('standalone focus resumes the ritual clock and completes without planting or bloom rewards',()=>{
 const f=fixture(),before=f.room.items.length,s=f.garden.start(1,null,15);assert.equal(s.standalone,true);f.garden.settle(f.room,1,LR);assert.equal(f.room.items.length,before);f.advance(60000);
 const rituals=R.create({store:f.store,now:f.now}),restored=G.create({store:f.store,rituals,now:f.now});assert.equal(restored.active.remaining,840000);assert.equal(restored.active.end,s.end);f.advance(840000);rituals.tick();assert.equal(restored.tick()[0].completed,true);assert.equal(restored.state.totalBlooms,0);assert.equal(restored.state.blossomsGrown,0);assert.equal(restored.settle(f.room,1,LR),false);
 restored.start(1,null,25);assert.equal(restored.pocket().standalone,true);assert.equal(restored.active,null);
});
test('a session without planting can detach from furniture without stopping its clock',()=>{
 const f=fixture(),s=f.garden.start(1,f.bed.id,15);f.garden.withoutPlant(s.id);f.garden.detach(1,f.bed.id);assert.equal(f.garden.active.id,s.id);assert.equal(f.garden.settle(f.room,1,LR),false);assert.equal(f.garden.active.plant,null);
});
