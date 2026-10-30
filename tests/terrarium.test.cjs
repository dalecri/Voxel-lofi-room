const {test}=require('node:test');
const assert=require('node:assert/strict');
const LR=require('../room.js');require('../furniture.js');
const W=require('../widgets.js'),D=require('../dashboard.js');
const store={get:(k,d)=>d,set(){}};
test('terrarium is a small three-wood diorama that fits normal furniture surfaces',()=>{
 const c=LR.CAT.terrarium;assert.equal(c.kind,'small');assert.equal(c.group,'decor');assert.equal(c.tap,'screen');assert.deepEqual(c.size,[1,1]);assert.equal(c.vars.length,3);
 const woods=new Set();for(const v of c.vars){woods.add(v[0]);const m=new LR.Model();c.build(m,v);assert.ok(m.parts.main.vox.size>80);for(const key of m.parts.main.vox.keys()){const [x,y,z]=LR.Model.decode(key);assert.ok(x>=0&&x<8&&z>=0&&z<8&&y>=0&&y<=10);}}
 assert.equal(woods.size,3);
 const r=new LR.Room(),desk=r.add(r.make('desk',{x:2,z:2}));const it=r.make('terrarium',{p:desk.id,lx:0,lz:0});assert.ok(r.canPlace(it));r.add(it);assert.equal(r.get(it.id).p,desk.id);
});
test('terrarium remains a local diorama without a widget or Voxel Worlds destination',async()=>{
 const w=W.create({store});assert.equal(W.attached('terrarium'),undefined);assert.deepEqual(w.destinations('terrarium'),[]);await w.refresh(['terrarium']);assert.deepEqual(w.destinations('terrarium'),[]);assert.equal(D.destinations(LR.CAT,w).find(d=>d.furnitureId==='terrarium'),undefined);
});
