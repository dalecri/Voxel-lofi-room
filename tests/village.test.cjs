const {test}=require('node:test'),assert=require('node:assert/strict');
const V=require('../village.js');
const CAT={door:{tap:'portal'},arch:{tap:'portal'},beadcurtain:{tap:'portal'},crt:{tap:'screen'},app:{tap:'portal',link:'https://example.com'}};
const room=(id,items=[])=>({id,name:'Room '+id,n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items});
test('room preview cache reuses identical decor and regenerates actual decor changes',()=>{
 const cache=V.createCache(),r=room(1,[{id:1,t:'chair',x:2,z:3,c:0}]);let calls=0;const draw=()=>`image-${++calls}`;
 assert.equal(cache.get(r,draw),'image-1');assert.equal(cache.get(structuredClone(r),draw),'image-1');assert.equal(calls,1);
 const renamed={...r,name:'New title',widgets:{note:'private'},letters:['secret']};assert.equal(cache.get(renamed,draw),'image-1');
 r.items[0].c=1;assert.equal(cache.get(r,draw),'image-2');r.wall.color=3;assert.equal(cache.get(r,draw),'image-3');r.n=14;assert.equal(cache.get(r,draw),'image-4');
 assert.equal(cache.get({...r,id:2},draw),'image-5');assert.equal(cache.size,2);
});
test('transient visitors, door destinations and tool contents never change decor fingerprints',()=>{
 const a=room(1,[{id:1,t:'door',link:2},{id:2,t:'whiteboard',text:'PRIVATE'}]),b=structuredClone(a);
 b.items[0].link=3;b.items[1].text='CHANGED';b.items.push({id:3,t:'cat',visitor:true});
 assert.equal(V.decorHash(a),V.decorHash(b));assert(!V.decorHash(a).includes('PRIVATE'));
 b.items[0].r=1;assert.notEqual(V.decorHash(a),V.decorHash(b));
});
test('preview cache is bounded and does not cache a failed render',()=>{
 const c=V.createCache(2);let n=0;const draw=()=>''+(++n);c.get(room(1),draw);c.get(room(2),draw);c.get(room(1),draw);c.get(room(3),draw);assert.equal(c.size,2);assert.equal(c.get(room(1),draw),'1');assert.equal(c.get(room(2),draw),'4');
 assert.throws(()=>c.get(room(8),()=>{throw Error('GPU unavailable')}));assert.equal(c.get(room(8),draw),'5');c.clear();assert.equal(c.size,0);
});
test('bridges reflect only existing linked rooms and portal doors, once per pair',()=>{
 const rooms=[room(1,[{t:'door',link:2},{t:'arch',link:2},{t:'crt',link:3},{t:'door',link:1},{t:'door',link:999}]),room(2,[{t:'beadcurtain',link:1},{t:'door',link:'3'}]),room(3),room(4)];
 assert.deepEqual(V.bridges(rooms,CAT),[{from:1,to:2},{from:2,to:3}]);
 rooms[0].items=[];rooms[1].items[0].link=null;assert.deepEqual(V.bridges(rooms,CAT),[{from:2,to:3}]);
 rooms[1].items=[];assert.deepEqual(V.bridges(rooms,CAT),[]);
});
test('serpentine layout fits every room without overlap at mobile and desktop sizes',()=>{
 for(const width of [240,280,320,390,480,540,760,1024])for(const count of [0,1,2,7,35]){
  const {positions,height}=V.layout(Array.from({length:count},(_,i)=>room(i)),width);assert.equal(positions.length,count);
  for(let i=0;i<count;i++){
   const a=positions[i];assert(a.x>=0 && a.x+a.w<=width+.001);assert(a.y>=0 && a.y+a.h<=height);
   for(const b of positions.slice(i+1))assert(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y,`${width}: ${i} overlaps ${b.id}`);
  }
  if(count>2)assert(new Set(positions.map(p=>p.x)).size>2,'organic offsets');
 }
});
