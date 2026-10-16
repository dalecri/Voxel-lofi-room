const {test}=require('node:test');
const assert=require('node:assert/strict');
const {quality,createActivity,createLoop,createVisualTracker}=require('../performance.js');
test('busy sources hold rendering, quiet expires at two seconds, any event wakes',()=>{
 let now=0,wakes=0;const a=createActivity({now:()=>now});a.onWake(()=>wakes++);
 a.begin();a.report('cats');now=5000;assert(a.continuous());
 a.begin();a.report('rain');a.begin();now=6999;assert(a.continuous());now=7000;assert(!a.continuous());
 a.presented();assert(!a.needsFrame());a.wake();assert(a.needsFrame());assert.equal(wakes,3);
 a.setCalm(true);assert.equal(a.quietMs,1000);a.begin();now+=1000;assert(!a.continuous());
 a.report('capture');assert(a.continuous());
});
test('Calm quality composes with device size, normal quality and large plots',()=>{
 assert.deepEqual(quality({calm:true,dpr:3,size:20}),{pixelRatio:1.25,shadowSize:1024,bloom:false,quietMs:1000});
 assert.equal(quality({calm:true,width:390,dpr:3}).pixelRatio,2);
 assert.equal(quality({dpr:1}).pixelRatio,1);assert.equal(quality({size:20}).shadowSize,4096);assert.equal(quality().shadowSize,2048);
 assert.equal(quality().bloom,true);assert.equal(quality().quietMs,2000);
});
test('idle maintenance submits no frames, resumes instantly, and stops cleanly',()=>{
 let time=0,id=0,draws=0,steps=0,busy=false;const rafs=new Map(),timers=new Map();
 const a=createActivity({now:()=>time});
 const l=createLoop({activity:a,now:()=>time,step:()=>{steps++;a.report('animation',busy);},draw:()=>draws++,raf:f=>{rafs.set(++id,f);return id;},cancel:id=>rafs.delete(id),delay:f=>{timers.set(++id,f);return id;},clear:id=>timers.delete(id)});
 const fire=(map,t)=>{time=t;const [id,f]=map.entries().next().value;map.delete(id);f();};
 l.start();fire(rafs,0);fire(rafs,2001);assert(l.sleeping);const n=draws;fire(timers,2101);assert.equal(draws,n);assert(steps>draws);assert.equal(rafs.size,0);
 a.wake();assert.equal(timers.size,0);assert.equal(rafs.size,1);fire(rafs,2102);assert.equal(draws,n+1);assert(!l.sleeping);
 busy=true;fire(rafs,5000);assert(rafs.size===1);busy=false;fire(rafs,7001);assert(l.sleeping);
 // A source can start outside the loop as well, with no polling delay.
 a.report('photo');assert.equal(rafs.size,1);l.stop();assert.equal(rafs.size+timers.size,0);
});
test('visible changes include texture paints, costume transforms, light and camera',()=>{
 let id=0;const node=()=>({id:++id,visible:true,position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1},scale:{x:1,y:1,z:1},children:[]});
 const scene=node(),camera=node(),child=node();camera.projectionMatrix={elements:[1,0,0,1]};scene.children=[child];child.material={id:1,opacity:1,visible:true,map:{version:0},color:{r:1,g:1,b:1}};
 const changed=createVisualTracker();assert(changed(scene,camera));assert(!changed(scene,camera));child.position.y=.001;assert(changed(scene,camera));child.material.map.version++;assert(changed(scene,camera));child.visible=false;assert(changed(scene,camera));assert(!changed(scene,camera));child.position.y=2;assert(!changed(scene,camera));camera.position.x=2;assert(changed(scene,camera));
});
