const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('three'),LR=require('../room.js');require('../furniture.js');require('../packs/mexico.js');
const Pack=require('../packs/pets.js'),Cozy=require('../cozy-furniture.js');Pack.register(LR);
const scope={LR,THREE,window:{LRCozyFurniture:Cozy},console,Math,setTimeout};vm.runInNewContext(fs.readFileSync(require.resolve('../render.js'),'utf8'),scope);
function fixture(){
 const room=new LR.Room(),view=Object.create(scope.window.LRRender.Renderer.prototype);
 Object.assign(view,{root:new THREE.Group(),room,objs:new Map(),pets:new Map(),solidMat:new THREE.MeshLambertMaterial(),glowMat:new THREE.MeshBasicMaterial(),env:{phase:'day',rain:false},hooks:{},t:0,yaw:0,beat:-1});view.icon=()=>{};
 const add=(t,o)=>{const it=room.add(room.make(t,o)),obj=view.makeObject(it,null,true);view.objs.set(it.id,obj);if(LR.CAT[t].kind==='pet')view.syncPet(it,obj,room);else view.placeObject(obj,it,room);view.walk=room.walkGrid();return it;};
 const life=Pack.createView({view,room,CAT:LR.CAT,random:()=>0});view.petLife=life;
 const step=seconds=>{for(let k=0;k<Math.ceil(seconds*20);k++){view.t+=.05;view.updatePets(.05,view.t);}};
 return {room,view,add,life,step};
}
test('28 ordinary pet definitions have names, build every palette, and stay out of the shop',()=>{
 assert.equal(Pack.IDS.length,28);assert.equal(new Set(Pack.IDS).size,28);
 for(const id of Pack.IDS){const C=LR.CAT[id];assert.ok(C.name);assert.equal(C.group,'pets');assert.ok(!C.shop);for(const v of C.vars){const m=new LR.Model();C.build(m,v);assert.ok(Object.values(m.parts).some(p=>p.vox.size),id);for(const p of Object.values(m.parts))for(const k of p.vox.keys())assert.ok(LR.Model.decode(k).every(Number.isFinite));}}
 assert.ok(!Pack.IDS.includes('cattree'));
});
test('perches, wall steps, nests and boxes expose reachable, reserved pet spots and stable favorites',()=>{
 const f=fixture(),cat=f.add('cat',{x:0,z:0}),perch=f.add('windowperch',{x:3,z:2}),box=f.add('cardbox',{x:6,z:2}),bed=f.add('donutbed',{x:3,z:5}),shelves=f.add('catshelves',{k:0,u:1,e:1});
 const spots=f.view.perches();for(const item of [perch,box,bed,shelves]){const ps=spots.filter(s=>s.owner===item.id);assert.ok(ps.length,item.t);assert.ok(ps.every(p=>p.y>0&&f.view.cellFree(...p.from)));}
 const P=f.view.pets.get(cat.id),p=spots.find(s=>s.owner===bed.id);P.next=p;assert.ok(!f.view.perches().some(s=>s.owner===bed.id));P.next=null;
 assert.equal(Cozy.favorite(cat,f.room.items,shelves.id,LR.CAT),shelves.id);
 const dogbed=f.add('dogbed',{x:6,z:5});assert.ok(!f.view.perches().some(s=>s.owner===dogbed.id));
});
test('treat jar on a sideboard and puzzle feeder use the existing bowl summon and eating ritual',()=>{
 for(const type of ['treatjar','puzzlefeeder']){
  const f=fixture(),cat=f.add('cat',{x:0,z:0});f.view.pets.get(cat.id).state='sit';
  const desk=type==='treatjar'?f.add('desk',{x:4,z:3}):null;
  const food=f.add(type,desk?{p:desk.id,lx:0,lz:0}:{x:4,z:3});
  assert.equal(LR.CAT[type].tap,'bowl');assert.equal(f.view.callCat(food.id),cat.id);
  f.step(7);assert.ok(['eat','sit','pet-play'].includes(f.view.pets.get(cat.id).state));
 }
 const f=fixture(),cat=f.add('cat',{x:0,z:0}),jar=f.add('treatjar',{x:3,z:3}),P=f.view.pets.get(cat.id);P.state='nap';assert.equal(f.view.callCat(jar.id),0,'a sleeping cat can decline');
});
test('scratching uses an adjacent free tile, then returns to ordinary cat behavior',()=>{
 const f=fixture(),cat=f.add('cat',{x:0,z:0}),post=f.add('scratchpost',{x:4,z:3}),P=f.view.pets.get(cat.id);P.state='sit';
 assert.ok(f.life.choose(P,'scratch'));f.step(6);assert.equal(P.petActivity?.kind,'scratch');assert.ok(f.view.cellFree(Math.floor(P.x),Math.floor(P.z)));assert.notEqual(Math.floor(P.x)+','+Math.floor(P.z),post.x+','+post.z);assert.ok(Math.abs(f.view.objs.get(cat.id).userData.inner.rotation.x)>0);
 f.step(11);assert.ok(!P.petActivity);
});
test('mouse skitters only on free cells; hamster wheel has gentle bursts and respects reduced motion',()=>{
 const f=fixture(),mouse=f.add('toymouse',{x:4,z:4}),cage=f.add('hamstercage',{x:6,z:6});const o=f.view.objs.get(mouse.id),before=o.position.clone();
 f.step(8);assert.ok(o.position.distanceTo(before)>.1);assert.ok(f.view.cellFree(Math.floor(o.position.x),Math.floor(o.position.z)));
 const wheel=f.view.objs.get(cage.id).userData.parts.wheel;Pack.animate(f.view.objs.get(cage.id),'wheel',1,false);const a=wheel.rotation.z;Pack.animate(f.view.objs.get(cage.id),'wheel',2,false);assert.notEqual(wheel.rotation.z,a);Pack.animate(f.view.objs.get(cage.id),'wheel',8,false);const held=wheel.rotation.z;Pack.animate(f.view.objs.get(cage.id),'wheel',9,false);assert.equal(wheel.rotation.z,held);Pack.animate(f.view.objs.get(cage.id),'wheel',10,true);assert.equal(wheel.rotation.z,0);
});
test('pet flap hides the same cat briefly and reliably returns it; removing the flap restores it too',()=>{
 const f=fixture(),cat=f.add('cat',{x:2,z:1}),flap=f.add('petflap',{k:0,u:2,e:0}),P=f.view.pets.get(cat.id),obj=f.view.objs.get(cat.id);P.state='sit';
 assert.ok(f.life.choose(P,'slip'));f.step(1.5);assert.equal(P.petActivity?.kind,'slip');assert.equal(obj.visible,false);f.step(3.1);assert.equal(obj.visible,true);assert.ok(!P.petActivity);assert.equal(f.view.pets.get(cat.id),P);
 P.state='sit';P.timer=0;assert.ok(f.life.choose(P,'slip'));f.step(1);f.room.remove(flap.id);f.step(.1);assert.equal(obj.visible,true);assert.ok(!P.petActivity);
});
test('dog uses a reachable dedicated bed, while edit mode pauses travel and no bed is harmless',()=>{
 const f=fixture(),dog=f.add('mxdog',{x:0,z:0}),bed=f.add('dogbed',{x:3,z:3});f.step(22);assert.equal(f.life.dogs.get(dog.id).state,'sleep');const p=f.view.itemPoint(bed.id,[7,3,7]);assert.ok(f.view.objs.get(dog.id).position.distanceTo(p)<.01);
 f.room.remove(bed.id);f.step(.1);assert.equal(f.life.dogs.get(dog.id).state,'idle');f.view.petsPaused=true;const pos=f.view.objs.get(dog.id).position.clone();f.step(5);assert.ok(f.view.objs.get(dog.id).position.equals(pos));
});
test('petting or redirecting a cat cancels ambient work, and a room reset releases hidden cats',()=>{
 const f=fixture(),cat=f.add('cat',{x:0,z:0}),post=f.add('scratchpost',{x:4,z:3}),P=f.view.pets.get(cat.id);P.state='sit';assert.ok(f.life.choose(P,'scratch'));
 f.view.petCat(cat.id);f.step(.1);assert.equal(P.state,'pet');assert.ok(!P.petPending&&!P.petActivity);assert.equal(P.onArrive,null);
 P.state='sit';P.timer=30;assert.ok(f.life.choose(P,'scratch'));assert.ok(f.view.walkCatTo(cat.id,1,0));f.step(.1);assert.ok(!P.petPending);assert.equal(P.onArrive,null);
 const flap=f.add('petflap',{k:0,u:1,e:0});P.path=null;P.state='sit';P.timer=30;assert.ok(f.life.choose(P,'slip'));f.step(2);assert.equal(f.view.objs.get(cat.id).visible,false);f.life.reset();assert.equal(f.view.objs.get(cat.id).visible,true);assert.ok(!P.petActivity);
});
test('a single hammock reserves one nap and a waiting cat claims a different approach tile',()=>{
 const f=fixture(),hammock=f.add('radhammock',{x:4,z:4}),one=f.add('cat',{x:1,z:3}),two=f.add('cat',{x:2,z:3});
 const P=f.view.pets.get(one.id),Q=f.view.pets.get(two.id),p=f.view.perches().find(s=>s.owner===hammock.id);assert.ok(p);P.perch=p;P.state='nap';Q.state='sit';Q.favoriteId=hammock.id;
 assert.ok(!f.view.perches().some(s=>s.owner===hammock.id));assert.ok(f.life.choose(Q));assert.ok(Q.path?.length);const last=Q.path.at(-1);assert.notDeepEqual(last,[p.px,p.pz]);
});
test('a mouse burst invites an awake nearby cat to chase through the same walk grid',()=>{
 const f=fixture(),cat=f.add('cat',{x:2,z:3}),mouse=f.add('toymouse',{x:4,z:4}),P=f.view.pets.get(cat.id);P.state='sit';P.timer=60;
 f.step(4.5);assert.ok(P.petPending?.id===mouse.id || P.petActivity?.kind==='chase');f.step(4);assert.equal(P.petActivity?.kind,'chase');
});
