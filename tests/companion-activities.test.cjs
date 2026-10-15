const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createBrain,pathTo}=require('../companion.js');
const env=extra=>({roomId:1,n:10,walk:new Array(100).fill(1),desks:[],windows:[],activities:[],seats:[],hour:18,phase:'evening',weather:'clear',beat:-1,quiet:false,editing:false,...extra});
const advance=(b,e,secs,check=()=>{})=>{for(let k=0;k<secs*10;k++){b.step(.1,e);check(b.state);}return b.state;};
const computer={id:1,kind:'type',x:4.5,z:2.5,height:1.5,screen:2,approaches:[{x:4.5,z:3.5}]};
test('evening desk begins within a minute, faces the screen and commits for 1-3 hours',()=>{
 const e=env({activities:[computer]}),b=createBrain();e.walk[24]=0;e.walk[25]=0;
 advance(b,e,59,s=>{if(s.activity?.stage==='move')assert.equal(e.walk[Math.floor(s.z)*10+Math.floor(s.x)],1);});
 assert.equal(b.state.mode,'type');assert.equal(b.state.pose,'type');assert.equal(b.state.x,4.5);assert.equal(b.state.z,3.5);
 assert.equal(b.state.heading,Math.PI);assert.ok(b.state.activity.remaining>3600 && b.state.activity.remaining<=10800);
 const spot=[b.state.x,b.state.z];advance(b,e,300);assert.deepEqual([b.state.x,b.state.z],spot);assert.equal(b.state.activity.kind,'type');
 e.hour=22;advance(b,e,60);assert.equal(b.state.mode,'type');
});
test('cardinal paths go around blockers, never diagonally through furniture, and reject sealed targets',()=>{
 const e=env();for(let z=0;z<9;z++)e.walk[z*10+4]=0;
 const route=pathTo(e,{x:2.5,z:2.5},[{x:6.5,z:2.5}]);assert.ok(route.some(p=>p.z===9.5));
 for(let k=1;k<route.length;k++)assert.equal(Math.abs(route[k].x-route[k-1].x)+Math.abs(route[k].z-route[k-1].z),1);
 e.walk[94]=0;assert.equal(pathTo(e,{x:2.5,z:2.5},[{x:6.5,z:2.5}]),null);
 const b=createBrain();e.activities=[computer];advance(b,e,120);assert.ok(['wander','idle'].includes(b.state.mode));
});
test('book pickup precedes reading on a seat, with minute-scale duration and page turns',()=>{
 const shelf={id:1,kind:'read',x:5.5,z:2.5,approaches:[{x:5.5,z:3.5}]};
 const seat={id:3,kind:'lounge',x:3,z:6,heading:0,approaches:[{x:3.5,z:7.5}],seat:{x:3,y:1,z:6.25}};
 const e=env({hour:14,phase:'day',activities:[shelf],seats:[seat]}),b=createBrain();e.walk[25]=0;e.walk[63]=0;
 const stages=new Set();advance(b,e,70,s=>stages.add(s.activity?.stage));
 assert.ok(stages.has('pull') && stages.has('to-seat'));assert.equal(b.state.pose,'read');assert.equal(b.state.y,1);assert.equal(b.state.heading,0);
 const active=b.state.activity;advance(b,e,60);assert.equal(b.state.activity,active);assert.ok(active.remaining>60);
});
test('books without seating read on a free floor tile; removed or moved furniture recovers',()=>{
 const shelf={id:1,kind:'read',x:5.5,z:2.5,approaches:[{x:5.5,z:3.5}]};const e=env({activities:[shelf]}),b=createBrain();e.walk[25]=0;
 advance(b,e,60);assert.equal(b.state.pose,'read');assert.equal(b.state.y,0);
 e.activities=[];advance(b,e,5);assert.equal(b.state.activity,null);assert.equal(e.walk[Math.floor(b.state.z)*10+Math.floor(b.state.x)],1);
});
test('midnight preempts work, uses a bed, and wakes up; missing beds power down in reachable corners',()=>{
 const bed={id:4,kind:'sleep',x:2,z:2,heading:0,approaches:[{x:2.5,z:3.5}],seat:{x:2,y:1.125,z:2}};
 const e=env({activities:[computer,bed]}),b=createBrain();advance(b,e,50);assert.equal(b.state.mode,'type');
 e.hour=0;e.phase='night';advance(b,e,90);assert.equal(b.state.pose,'sleep');assert.equal(b.state.y,1.125);assert.equal(b.state.brightness,.18);
 e.hour=8;e.phase='morning';advance(b,e,15);assert.notEqual(b.state.mode,'sleep');
 const c=createBrain(),empty=env({hour:0,phase:'night'});advance(c,empty,90);assert.equal(c.state.pose,'powerdown');assert.equal(c.state.x,.5);assert.equal(c.state.z,.5);
});
test('morning favors window or tea, paused and reduced-motion sessions stay quiet',()=>{
 const window={id:4,kind:'window',x:5.5,z:0,approaches:[{x:5.5,z:.5}]};
 const e=env({hour:8,phase:'morning',activities:[window,computer],reducedMotion:true}),b=createBrain();advance(b,e,50);
 assert.equal(b.state.mode,'window');assert.equal(b.state.blink,false);assert.equal(b.state.weight,0);assert.equal(b.state.tilt,0);
 const remaining=b.state.activity.remaining;e.quiet=true;advance(b,e,60);assert.equal(b.state.activity.remaining,remaining);
});
