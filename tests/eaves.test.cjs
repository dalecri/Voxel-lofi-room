const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('three');
const L=require('../room.js');require('../furniture.js');const Widgets=require('../widgets.js');
const scope={LR:L,THREE,window:{},console,Math};vm.runInNewContext(fs.readFileSync(require.resolve('../render.js'),'utf8'),scope);const R=scope.window.LRRender.Renderer.prototype;
function voxels(n,c){const m=new L.Model();L.CAT.eaves.build(m,L.CAT.eaves.vars[c],{roomSize:n});return Object.values(m.parts).flatMap(p=>[...p.vox].map(([key,color])=>{const v=L.Model.decode(key);return {v:v.map((x,i)=>x+(p.local?p.pivot[i]:0)),local:L.Model.decode(key),color};}));}
function renderer(n){const r=Object.create(R);Object.assign(r,{solidMat:new THREE.MeshLambertMaterial(),glowMat:new THREE.MeshBasicMaterial(),env:{phase:'day',rain:false,roomSize:n},root:new THREE.Group(),objs:new Map(),mask:3});return r;}
test('eaves build every palette as an open perimeter at 10/14/20/24 and 32 cells',()=>{
 const C=L.CAT.eaves;assert.equal(C.group,'decor');assert.equal(C.vars.length,4);assert.ok(C.singleton);assert.ok(C.roomTrim);
 for(const n of [10,14,20,24,32]){const hashes=new Set();for(let c=0;c<C.vars.length;c++){
  const a=voxels(n,c),edge=n*L.V,set=new Set(a.map(p=>p.v.join(',')));assert.ok(a.length>0);assert.equal(set.size,a.length,'no overlapping corner or segment voxels');
  assert.equal(Math.min(...a.map(p=>p.v[0])),-8);assert.equal(Math.max(...a.map(p=>p.v[0])),edge+7);assert.equal(Math.min(...a.map(p=>p.v[2])),-8);assert.equal(Math.max(...a.map(p=>p.v[2])),edge+7);
  for(const {v:[x,y,z],local,color} of a){assert.ok(Number.isFinite(color));assert.ok(local.every(v=>v>=-64&&v<=191),'no packed-coordinate overflow');assert.ok(y>=L.HC*L.V-2&&y<L.HC*L.V+4);assert.ok(x<1||x>=edge-1||z<1||z>=edge-1,'interior stays open');}
  for(const u of [1,edge/2,edge-2])for(const p of [[u,56,-1],[u,56,edge],[ -1,56,u],[edge,56,u],[u,54,-8],[u,54,edge+7]])assert.ok(set.has(p.join(',')),n+': '+p);
  hashes.add(JSON.stringify(a.map(p=>p.color)));
 }assert.equal(hashes.size,4);}
});
test('a second eaves placement replaces the old trim without occupying floor or ceiling space',()=>{
 const room=new L.Room(),table=room.add(room.make('coffee',{x:4,z:4}));const first=room.make('eaves',{x:4,z:4,c:0});assert.ok(room.canPlace(first));room.add(first);assert.ok(room.canPlace(room.make('pendantlamp',{x:4,z:4})));
 const before=room.snapshot(),second=room.make('eaves',{x:9,z:9,c:3});assert.ok(room.canPlace(second));room.add(second);assert.equal(room.count(i=>i.t==='eaves'),1);assert.equal(room.items.find(i=>i.t==='eaves').c,3);assert.equal(room.get(first.id),null);assert.ok(room.get(table.id));assert.ok(room.canPlace(room.make('floorlamp',{x:9,z:9})));
 assert.equal(room.walkGrid()[9*room.n+9],1);room.restore(before);assert.equal(room.count(i=>i.t==='eaves'),1);assert.equal(room.items.find(i=>i.t==='eaves').c,0);
 const d=room.serialize();d.items.push({...d.items.find(i=>i.t==='eaves'),id:999,c:2});room.load(d);assert.equal(room.count(i=>i.t==='eaves'),1);assert.equal(room.items.find(i=>i.t==='eaves').c,2);
});
test('rendered trim is shell-anchored, resizes its cache, and follows every wall cutaway mask',()=>{
 const r=renderer(10),room=new L.Room(),it=room.add(room.make('eaves',{x:7,z:3,r:2}));r.room=room;let oldKey;
 for(const n of [10,14,20,24,32]){room.n=n;r.env.roomSize=n;const obj=r.makeObject(it,null,true);r.objs.set(it.id,obj);r.placeObject(obj,it,room);assert.deepEqual(obj.position.toArray(),[0,0,0]);assert.equal(obj.rotation.y,0);assert.deepEqual(obj.userData.inner.position.toArray(),[0,0,0]);
 const bounds=new THREE.Box3().setFromObject(obj);assert.equal(bounds.min.x,-1);assert.equal(bounds.max.x,n+1);assert.equal(bounds.min.z,-1);assert.equal(bounds.max.z,n+1);assert.notEqual(obj.userData.key,oldKey);oldKey=obj.userData.key;
 for(const mask of [0,1,2,3,5,6,9,10,12,15]){r.mask=mask;r.applyVisibility();assert.equal(obj.visible,!!mask);for(const [name,part] of Object.entries(obj.userData.parts)){const k=Number(name[5]);assert.equal(part.visible,!!(mask&(1<<k)));assert.equal(r.isShown(part),!!(mask&(1<<k)));}}
 r.hiddenId=it.id;r.applyVisibility();assert.equal(obj.visible,false);r.hiddenId=0;
 }
});
test('eaves survive the actual room-code helpers and decor projection',async()=>{
 const main=fs.readFileSync(require.resolve('../main.js'),'utf8'),chunk=main.slice(main.indexOf('  const b64u ='),main.indexOf('  function codeSheet(')),room=new L.Room();room.n=24;room.add(room.make('eaves',{x:20,z:12,c:3}));
 const context={btoa,atob,TextEncoder,TextDecoder,LRWidgets:Widgets,room,isSaved:()=>false};vm.runInNewContext(chunk+';globalThis.code=roomCode;globalThis.read=readCode;',context);
 const code=await context.code();assert.ok(code.startsWith('LR0.'));const data=await context.read(code),restored=new L.Room();assert.ok(restored.load(data));assert.equal(restored.n,24);assert.equal(restored.items.length,1);assert.equal(restored.items[0].t,'eaves');assert.equal(restored.items[0].c,3);assert.deepEqual(restored.items[0].x,20);
});
