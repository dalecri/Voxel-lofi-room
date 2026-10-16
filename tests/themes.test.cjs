const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('three');
const L=require('../room.js');require('../furniture.js');const groups=require('./theme-packs.json'),packs=groups.map(g=>require('../packs/'+g+'.js'));
const scope={LR:L,THREE,window:{},console,Math};vm.runInNewContext(fs.readFileSync(require.resolve('../render.js'),'utf8'),scope);
test('theme packs register eight distinct, free pieces and three built palettes each',()=>{
 const ids=new Set();for(const pack of packs){assert.equal(pack.ids.length,8);assert.equal(L.GROUPS.filter(g=>g[0]===pack.group).length,1);
 for(const id of pack.ids){assert.ok(!ids.has(id));ids.add(id);const C=L.CAT[id];assert.ok(C.name);assert.equal(C.group,pack.group);assert.equal(C.vars.length,3);assert.ok(!C.shop);const hashes=new Set();
 for(const v of C.vars)for(const on of [true,false]){const m=new L.Model();assert.doesNotThrow(()=>C.build(m,v,{on}));assert.ok(Object.values(m.parts).some(p=>p.vox.size),id);let voxels=0;for(const p of Object.values(m.parts)){assert.ok(p.pivot.every(Number.isFinite));for(const [k,col] of p.vox){const [x,y,z]=L.Model.decode(k);assert.ok(x>=-8&&z>=-8&&x<=64&&z<=64&&y>=-1&&y<=80,id);assert.equal(typeof col,'number');voxels++;}}assert.ok(voxels<60000,id);if(on)hashes.add(JSON.stringify(Object.values(m.parts).map(p=>[...p.vox])));}
 assert.ok(hashes.size>=2,'palette must change visible art: '+id);
 }}assert.equal(ids.size,groups.length*8);
});
test('spinning art and lava use real renderer animation, and pottery starts only after a tap',()=>{
 const r=Object.create(scope.window.LRRender.Renderer.prototype);Object.assign(r,{solidMat:new THREE.MeshLambertMaterial(),glowMat:new THREE.MeshBasicMaterial(),env:{phase:'day'},root:new THREE.Group(),objs:new Map()});
 for(const p of packs)for(const id of p.ids){const C=L.CAT[id],it={t:id,id:11,c:0,on:true},m=new L.Model();C.build(m,C.vars[0],{on:true});if(!m.parts.spin&&C.anim!=='lava')continue;
 const obj=r.makeObject(it,null,true);if(C.anim==='lava')obj.userData.blobs=Array.from({length:3},(_,k)=>{const b=new THREE.Group();b.userData.ph=k;return b;});
 const part=obj.userData.parts.spin,before=part?.rotation[C.spinAxis||'y'];r.animatePiece(obj,it,C,.2,1);if(part&&C.spinIdle===0){assert.equal(part.rotation.y,before,id);obj.userData.spinV=9;r.animatePiece(obj,it,C,.2,2);assert.ok(part.rotation.y>before,id);}else if(part)assert.notEqual(part.rotation[C.spinAxis||'y'],before,id);
 if(C.anim==='lava')assert.ok(obj.userData.blobs.every(b=>b.visible&&Number.isFinite(b.position.y)));
 if(part){r.reducedMotion=true;const held=part.rotation.clone();r.animatePiece(obj,it,C,.2,3);assert.ok(part.rotation.equals(held));r.reducedMotion=false;}
 }
});
test('signature behaviors use existing tap, fire, water, screen, music and door contracts',()=>{
 const tap=id=>L.CAT[id]?.tap;
 assert.equal(tap('pottery-wheel'),'spin');assert.equal(L.CAT['observatory-orrery'].spinOn,.14);
 if(L.CAT['riad-fountain'])assert.equal(L.CAT['riad-fountain'].emit.kind,'drip');
 if(L.CAT['retro70s-lava'])assert.equal(L.CAT['retro70s-lava'].anim,'lava');
 if(L.CAT['speakeasy-gramophone']){assert.equal(tap('speakeasy-gramophone'),'mood');assert.equal(L.CAT['speakeasy-gramophone'].musicMood,1);assert.equal(tap('speakeasy-door'),'portal');}
 if(L.CAT['saloon-piano'])assert.equal(tap('saloon-piano'),'piano');
});
