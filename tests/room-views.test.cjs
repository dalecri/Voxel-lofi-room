const {test}=require('node:test'),assert=require('node:assert/strict');
require('../village.js');const V=require('../room-views.js');
const storage=()=>{const data={};return {get:(k,d)=>data[k] ?? d,set:(k,v)=>{data[k]=structuredClone(v);},data};};
test('Rooms view choice persists and invalid choices safely use the default grid',()=>{
 const store=storage();assert.equal(V.viewOf(store),'grid');for(const view of V.VIEWS){V.choose(store,view);assert.equal(V.viewOf(store),view);assert.equal(store.data['lr.roomsView'],view);}V.choose(store,'bad');assert.equal(V.viewOf(store),'showcase');store.set(V.KEY,'bad');assert.equal(V.viewOf(store),'grid');
});
test('blueprint groups floors, places every room without overlap and maps actual portal links',()=>{
 const rooms=[{id:1,floorLevel:'Upstairs',items:[{t:'door',link:3}]},{id:2,items:[],floor:{style:'oak'}},{id:3,floorLevel:'Upstairs',items:[{t:'door',link:1},{t:'crt',link:2}]},{id:4,items:[]}];
 for(const width of [180,280,390,528,1000]){const p=V.blueprint(rooms,width,{door:{tap:'portal'},crt:{tap:'screen'}});assert.deepEqual(p.groups.map(g=>g.floor),['Upstairs','Ground floor']);assert.deepEqual(p.positions.map(g=>g.id),[1,3,2,4]);assert.equal(p.connectors.length,1);assert.equal(p.connectors[0].a.id,1);assert.equal(p.connectors[0].b.id,3);
 for(const a of p.positions){assert(a.x>=0&&a.x+a.w<=width);for(const b of p.positions.filter(b=>b.id!==a.id))assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}}
 assert.equal(V.blueprint([],390,{}).height,0);
});
test('one shared saved PNG cache deduplicates decor, captures new dayparts and survives reload',()=>{
 const store=storage(),options={store,hash:globalThis.LRVillage.decorHash,limit:2},c=V.createSnapshots(options),r={id:1,items:[]};let renders=0;const render=()=>`data:image/png;base64,${++renders}`;
 c.capture(r,'day',render);c.capture(r,'day',render);assert.equal(renders,1);assert.equal(V.createSnapshots(options).get(1).url,'data:image/png;base64,1');c.capture(r,'night',render);assert.equal(renders,2);r.items.push({t:'bed',x:1});c.capture(r,'night',render);assert.equal(renders,3);
 c.capture({id:2},'night',render);c.capture({id:3},'night',render);assert.equal(Object.keys(store.data[V.SNAPSHOTS]).length,2);c.remove(3);assert.equal(c.get(3),null);
 assert.equal(c.capture({id:4},'day',()=>{throw Error('capture unavailable');}),null);assert.equal(c.capture({id:5},'day',()=>null),null);
});
test('saved lighting variants serve a new daypart without another render',()=>{
 const store=storage(),c=V.createSnapshots({store,hash:r=>JSON.stringify(r)}),r={id:1};let calls=0;
 const render=()=>{calls++;return {day:'data:image/png;base64,DAY',night:'data:image/png;base64,NIGHT'};};
 assert.equal(c.capture(r,'day',render),'data:image/png;base64,DAY');assert.equal(c.capture(r,'night',render),'data:image/png;base64,NIGHT');assert.equal(calls,1);assert.equal(c.get(1,'night').url,'data:image/png;base64,NIGHT');
});
test('universal search includes real room names without changing other source groups',()=>{
 const H=require('../home.js');assert.deepEqual(H.search('Tea',{rooms:[{id:1,name:'Tea room'}],CAT:{kettle:{name:'Tea kettle'}}}).map(g=>g.type),['Rooms','Furniture']);
});
