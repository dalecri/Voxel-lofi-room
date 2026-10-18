const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('three');
const L=require('../room.js');require('../furniture.js');
const scope={LR:L,THREE,window:{},console,Math};vm.runInNewContext(fs.readFileSync(require.resolve('../render.js'),'utf8'),scope);
test('microwave, pendant and sliding glass door build every palette in both states',()=>{
 for(const id of ['microwave','pendantlamp','slidingdoor']){const C=L.CAT[id],palettes=new Set();assert.ok(C.name);assert.equal(C.vars.length,3);assert.ok(!C.shop);
 for(const v of C.vars)for(const on of [false,true]){const m=new L.Model();assert.doesNotThrow(()=>C.build(m,v,{on,seed:1,phase:'day',rain:false}));assert.ok(Object.values(m.parts).some(p=>p.vox.size));for(const p of Object.values(m.parts))for(const [key,color] of p.vox){const [x,y,z]=L.Model.decode(key);assert.ok(x>=0&&x<=24&&y>=0&&y<=56&&z>=0&&z<=9,id);assert.ok(Number.isFinite(color));}if(on)palettes.add(JSON.stringify(Object.values(m.parts).map(p=>[...p.vox])));}
 assert.equal(palettes.size,3,id);
 }
 assert.equal(L.CAT.microwave.kind,'small');assert.equal(L.CAT.microwave.group,'kitchen');assert.equal(L.CAT.pendantlamp.group,'lights');assert.equal(L.CAT.slidingdoor.group,'doors');assert.deepEqual(L.CAT.slidingdoor.size,[3,3]);
});
test('existing door animation opens, holds, and closes persistent hinges and sliding panels',()=>{
 const r=Object.create(scope.window.LRRender.Renderer.prototype);Object.assign(r,{solidMat:new THREE.MeshLambertMaterial(),glowMat:new THREE.MeshBasicMaterial(),env:{phase:'day'},root:new THREE.Group(),objs:new Map()});
 for(const id of ['microwave','slidingdoor']){const C=L.CAT[id],it={t:id,id:10,c:0,on:false},obj=r.makeObject(it,null,true),part=obj.userData.parts[id==='microwave'?'door':'slide'];const position=()=>id==='microwave'?part.rotation.y:part.position.x;
 r.animatePiece(obj,it,C,.2,1);const closed=position();it.on=true;r.animatePiece(obj,it,C,.1,2);assert.notEqual(position(),closed);r.animatePiece(obj,it,C,.2,3);const opened=position();r.animatePiece(obj,it,C,.2,100);assert.equal(position(),opened,'stays open beyond the old timed auto-close');it.on=false;r.animatePiece(obj,it,C,.2,101);assert.equal(position(),closed);
 const loaded=r.makeObject({...it,on:true},null,true);r.animatePiece(loaded,{...it,on:true},C,.01,102);assert.equal(id==='microwave'?loaded.userData.parts.door.rotation.y:loaded.userData.parts.slide.position.x,opened);
 }
});
test('pendant can hang over a table, does not block walking, and cannot stack another pendant',()=>{
 const room=new L.Room(),table=room.add(room.make('coffee',{x:4,z:4}));
 const lamp=room.make('pendantlamp',{x:4,z:4});assert.ok(room.canPlace(lamp));room.add(lamp);assert.equal(room.canPlace(room.make('pendantlamp',{x:4,z:4})),false);
 room.remove(table.id);assert.equal(room.walkGrid()[4*room.n+4],1);assert.ok(room.canPlace(room.make('coffee',{x:4,z:4})));
});
test('door and light toggles use existing state persistence and mute-aware sound methods',()=>{
 const room=new L.Room();for(const id of ['microwave','pendantlamp','slidingdoor'])room.add(room.make(id,{x:0,z:0,on:true}));const restored=new L.Room();restored.load(room.serialize());assert.ok(restored.items.every(it=>it.on));
 const sound={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../sound.js'),'utf8'),sound);const S=sound.window.LofiSound;S.on=false;let calls=0;S.tone=()=>calls++;for(const id of ['microwave','slidingdoor']){const C=L.CAT[id];assert.equal(C.fx.toggle,true);assert.equal(typeof S[C.fx.sfx],'function');S[C.fx.sfx]();}assert.equal(calls,0);
});
