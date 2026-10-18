const {test}=require('node:test'),assert=require('node:assert/strict');
require('../village.js');const V=require('../room-views.js');
const storage=()=>{const data={};return {get:(k,d)=>data[k] ?? d,set:(k,v)=>{data[k]=structuredClone(v);},data};};
test('room floor labels and descriptions remain meaningful in grid cards',()=>{
 assert.equal(V.floorOf({floor:{style:'oak'}}),'Ground floor');
 assert.equal(V.floorOf({floorLabel:'Upstairs'}),'Upstairs');
 assert.equal(V.description({floor:{style:'oak'},wall:{style:'paint'}}),'oak floors · paint walls');
 assert.equal(V.description({description:'A quiet nook'}),'A quiet nook');
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
