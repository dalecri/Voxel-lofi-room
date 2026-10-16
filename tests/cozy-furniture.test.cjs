const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const LR=require('../room.js');require('../furniture.js');require('../room-tools.js').register(LR);
const C=require('../cozy-furniture.js'),W=require('../widgets.js');C.register(LR);
function store(){const values={};return {values,get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}};}
test('all twelve additions build every variant, with distinct movable plates/strings/beads and nonblocking big rugs',()=>{
 assert.equal(C.IDS.length,12);
 for(const id of C.IDS){const d=LR.CAT[id];assert.ok(d.name);for(const v of d.vars){const m=new LR.Model();d.build(m,v,{on:true});assert.ok(m.parts.main.vox.size,id);for(const p of Object.values(m.parts))for(const key of p.vox.keys()){const [x,y,z]=LR.Model.decode(key);assert.ok([x,y,z].every(Number.isFinite),id);}}}
 for(const [id,prefix,count] of [['sushiconveyor','plate',6],['harp','string',7],['beadcurtain','bead',8]]){const d=LR.CAT[id],m=new LR.Model();d.build(m,d.vars[0],{});assert.equal(Object.keys(m.parts).filter(k=>k.startsWith(prefix)).length,count);}
 assert.equal(LR.CAT.beadcurtain.tap,'portal');assert.equal(LR.CAT.tipjar.privateTool,'savings');
 assert.equal(LR.CAT.bigrug.kind,'rug');assert.deepEqual(LR.CAT.bigrug.size,[8,7]);assert.equal(LR.CAT.cloudrug.kind,'rug');
 assert.equal(LR.CAT.calllaptop.channels[0],'catcall');assert.ok(LR.MOMENTS.some(m=>m[0]==='sushisupper'));
});
test('conveyor is a continuous 80-second loop with six separated plates inside the counter',()=>{
 for(let t=0;t<160;t+=.125){const pts=Array.from({length:6},(_,i)=>C.plateAt(t,i));for(const p of pts)assert.ok(p.x>=3&&p.x<=29&&p.z>=3&&p.z<=13);for(let i=0;i<6;i++){const repeat=C.plateAt(t+80,i);assert.ok(Math.hypot(repeat.x-pts[i].x,repeat.z-pts[i].z)<1e-9);const next=C.plateAt(t+.01,i);assert.ok(Math.hypot(next.x-pts[i].x,next.z-pts[i].z)<.01);for(let j=i+1;j<6;j++)assert.ok(Math.hypot(pts[i].x-pts[j].x,pts[i].z-pts[j].z)>=8);}}
});
test('photo pins and whiteboard text persist privately per surface and room, without copying photos',()=>{
 const s=store(),m=C.create({store:s});m.write(1,2,'PRIVATE_WHITEBOARD');assert.ok(m.pin(1,3,'photo-one',2));assert.ok(m.pin(1,3,'photo-two',2));assert.equal(m.pin(1,3,'third',2),false);
 assert.equal(C.create({store:s}).surface(1,2).text,'PRIVATE_WHITEBOARD');assert.equal(m.surface(2,2).text,'');assert.deepEqual(m.surface(1,3).pins,['photo-one','photo-two']);m.pin(1,3,'photo-one',2);assert.deepEqual(m.surface(1,3).pins,['photo-two']);
 const r=new LR.Room();r.add(r.make('photocollage',{k:0,u:0,e:1}));r.add(r.make('whiteboard',{k:1,u:0,e:1}));const d=r.serialize();d.cozy=s.values[C.KEY];d.items[0].pins=['PRIVATE_PHOTO'];const clean=W.shareDecor(d),fresh=new LR.Room();assert.ok(fresh.load(clean));assert.equal(fresh.items.length,2);assert.ok(!JSON.stringify(clean).includes('PRIVATE_'));assert.equal(s.values[C.KEY]['1:2'].text,'PRIVATE_WHITEBOARD');
 assert.equal(C.photoURL('https://example.com/private.png'),'');assert.equal(C.photoURL('data:image/svg+xml;base64,PHN2Zz4='),'');assert.equal(C.photoURL('data:image/png;base64,YQ=='),'data:image/png;base64,YQ==');
});
test('cat favorites are stable while occupied or a new seat is added; deleted favorites recover',()=>{
 const items=[{id:2,t:'sofa'},{id:3,t:'armchair'},{id:4,t:'desk'}],cat={id:7,name:'Miso'};
 const first=C.favorite(cat,items,null,LR.CAT);assert.ok([2,3].includes(first));assert.equal(C.favorite(cat,items,first,LR.CAT),first);assert.equal(C.favorite(cat,[{id:1,t:'bed'},...items],first,LR.CAT),first);assert.notEqual(C.favorite(cat,items.filter(i=>i.id!==first),first,LR.CAT),first);assert.equal(C.favorite(cat,[],first,LR.CAT),null);const s=store(),model=C.create({store:s}),picked=model.favorite(1,cat,items,LR.CAT);assert.equal(C.create({store:s}).favorite(1,cat,[{id:1,t:'bed'},...items],LR.CAT),picked);
});
test('dreamcatchers boost existing dream mode once, without inventing time or changing enabled settings',()=>{
 assert.equal(C.dreamStrength([],LR.CAT),1);assert.equal(C.dreamStrength([{t:'dreamcatcher'}],LR.CAT),1.25);assert.equal(C.dreamStrength([{t:'dreamcatcher'},{t:'dreamcatcher'}],LR.CAT),1.25);
});
test('harp is a new manual pluck voice, follows mute, and covers seven distinct strings',()=>{
 const scope={window:{},Math};vm.runInNewContext(fs.readFileSync(require.resolve('../sound.js'),'utf8'),scope);const s=scope.window.LofiSound,calls=[];s.ready=()=>false;s.tone=(...a)=>calls.push(a);s.harp(0);assert.equal(calls.length,0);s.ready=()=>true;s.ctx={currentTime:1};for(let i=0;i<7;i++)s.harp(i);assert.equal(calls.length,21);assert.equal(new Set(calls.filter((_,i)=>i%3===0).map(c=>c[0])).size,7);assert.ok(calls.every(c=>c[4]==='sine'));
});
test('the offline video call draws four cats, one brief dropout, then four cats again',()=>{
 let draw;const sprites=[],g={fillRect(){},fillText(){},save(){},restore(){},translate(){},scale(){}};
 C.registerScreens({add(name,fn){assert.equal(name,'catcall');draw=fn;},sprite(...args){sprites.push(args);}});
 draw(g,128,80,10);assert.equal(sprites.length,4);sprites.length=0;draw(g,128,80,35);assert.equal(sprites.length,3);sprites.length=0;draw(g,128,80,41);assert.equal(sprites.length,4);
});
