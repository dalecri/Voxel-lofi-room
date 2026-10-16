const {test}=require('node:test');
const assert=require('node:assert/strict');
const {quality,createActivity,createLoop,createVisualTracker,createShadows}=require('../performance.js');
test('busy sources hold rendering, quiet expires at two seconds, any event wakes',()=>{
 let now=0,wakes=0;const a=createActivity({now:()=>now});a.onWake(()=>wakes++);
 a.begin();a.report('cats');now=5000;assert(a.continuous());
 a.begin();a.report('rain');a.begin();now=6999;assert(a.continuous());now=7000;assert(!a.continuous());
 a.presented();assert(!a.needsFrame());a.wake();assert(a.needsFrame());assert.equal(wakes,3);
 a.setCalm(true);assert.equal(a.quietMs,1000);a.begin();now+=1000;assert(!a.continuous());
 a.report('capture');assert(a.continuous());
});
test('Calm quality composes with device size, normal quality and large plots',()=>{
 assert.deepEqual(quality({calm:true,dpr:3,size:20}),{pixelRatio:1,shadowSize:1024,bloom:false,quietMs:1000,antialias:false,toneMapping:'none',powerPreference:'low-power',shadowAutoUpdate:false,fps:30});
 assert.equal(quality({calm:true,width:390,dpr:3}).pixelRatio,1);
 assert.equal(quality({dpr:1}).pixelRatio,1);assert.equal(quality({size:20}).shadowSize,4096);assert.equal(quality().shadowSize,2048);
 assert.equal(quality().bloom,true);assert.equal(quality().quietMs,2000);assert.equal(quality().antialias,true);assert.equal(quality().toneMapping,'aces');assert.equal(quality().powerPreference,'default');assert.equal(quality().shadowAutoUpdate,true);assert.equal(quality().fps,0);
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

test('Calm caps GPU submissions at 30 fps while input and simulation keep every RAF',()=>{
 for(const hz of [60,120,144]){
  let time=0,id=0,steps=0,draws=0;const rafs=new Map(),a=createActivity({now:()=>time,calm:true});
  const l=createLoop({activity:a,now:()=>time,step:()=>{steps++;a.report('rain');},draw:()=>draws++,raf:f=>{rafs.set(++id,f);return id;},cancel:id=>rafs.delete(id)});
  const tick=t=>{time=t;const [id,f]=rafs.entries().next().value;rafs.delete(id);f();};
  l.start();for(let i=0;i<=hz;i++)tick(i*1000/hz);
  assert(draws>=28 && draws<=32,`${hz} Hz: ${draws} submissions`);assert.equal(steps,hz+1);
  // An explicit mode change restores the original uncapped path immediately.
  a.setCalm(false);const before=draws;for(let i=1;i<=hz;i++)tick(1000+i*1000/hz);assert.equal(draws-before,hz);l.stop();
 }
});
test('capture bypasses the cap while Calm remains enabled',()=>{
 let time=0,id=0,draws=0;const rafs=new Map(),a=createActivity({now:()=>time,calm:true});
 const l=createLoop({activity:a,now:()=>time,fullRate:()=>true,step:()=>a.report('capture'),draw:()=>draws++,raf:f=>{rafs.set(++id,f);return id;},cancel:id=>rafs.delete(id)});
 l.start();for(let i=0;i<60;i++){time=i*1000/60;const [id,f]=rafs.entries().next().value;rafs.delete(id);f();}assert.equal(draws,60);l.stop();
});
test('static shadows update once per invalidation and restore always-on mode',()=>{
 const a=createActivity({now:()=>0}),map={autoUpdate:true,needsUpdate:false};
 const shadows=createShadows({map,revision:()=>a.revision});shadows.setCalm(true);assert(!map.autoUpdate);
 let passes=0;const render=(changed=false)=>{shadows.prepare(changed);if(map.autoUpdate || map.needsUpdate){passes++;map.needsUpdate=false;}};
 render();assert.equal(passes,1);for(let i=0;i<120;i++)render();assert.equal(passes,1);
 a.wake();for(let i=0;i<120;i++)render();assert.equal(passes,2);
 a.report('rain');a.report('particles');for(let i=0;i<120;i++)render();assert.equal(passes,2);
 render(true);for(let i=0;i<120;i++)render();assert.equal(passes,3);
 shadows.setCalm(false);assert(map.autoUpdate);for(let i=0;i<5;i++)render();assert.equal(passes,8);
});
test('shadow tracking follows casters and their parents, not flicker or non-casting effects',()=>{
 let id=0;const node=()=>({id:++id,visible:true,position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1},scale:{x:1,y:1,z:1},children:[]});
 const scene=node(),parent=node(),mesh=node(),effect=node(),light=node();scene.children=[parent,effect,light];parent.children=[mesh];mesh.castShadow=true;mesh.material={id:1,visible:true,opacity:1,side:0,alphaTest:0,color:{r:1,g:1,b:1}};light.isLight=true;light.intensity=1;light.color={r:1,g:1,b:1};light.castShadow=true;
 const changed=createVisualTracker({shadows:true});assert(changed(scene));assert(!changed(scene));
 light.intensity=2;effect.position.x=1;mesh.material.color.r=.5;assert(!changed(scene));
 parent.position.x=1;assert(changed(scene));assert(!changed(scene));mesh.quaternion.z=.1;assert(changed(scene));light.position.x=1;assert(changed(scene));mesh.visible=false;assert(changed(scene));
});
