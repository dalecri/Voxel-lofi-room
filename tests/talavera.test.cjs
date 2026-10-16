const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const LR=require('../room.js');require('../furniture.js');require('../packs/mexico.js');
const collection=Object.entries(LR.CAT).filter(([,c])=>c.group==='talavera');
test('Talavera collection has distinct furniture, ceramics and wall decor in three coordinated palettes',()=>{
 assert.equal(collection.length,15);const hashes=new Set();
 for(const [id,c] of collection){assert.equal(c.vars.length,3,id);assert.equal(c.shop,undefined);assert.ok(c.name.startsWith('Talavera'));const variants=new Set();
  for(const v of c.vars){const m=new LR.Model();c.build(m,v,{on:true});assert.ok(m.parts.main.vox.size>20,id);
   for(const key of m.parts.main.vox.keys()){const [x,y,z]=LR.Model.decode(key);assert.ok(x>=0&&x<c.size[0]*8&&y>=0&&y<40&&z>=0&&z<(c.kind==='wall'?c.depth:c.size[1]*8),`${id}: ${x},${y},${z}`);if(c.kind==='wall')assert.ok(y<c.size[1]*8);}
   const hash=createHash('sha256').update(JSON.stringify([...m.parts.main.vox])).digest('hex');hashes.add(hash);variants.add(hash);
  }assert.equal(variants.size,3,id);
 }assert.equal(hashes.size,45);
 assert.ok(LR.CAT.mxcounter);assert.equal(LR.CAT.mxcounter.group,'mexico');assert.ok(LR.WALLS.mxtalavera);
});
test('Talavera surfaces accept normal smalls, chairs remain seats and the ceramic lamp uses the normal light toggle',()=>{
 const r=new LR.Room();for(const [id,c] of collection.filter(([,c])=>c.top)){
  r.items=[];const owner=r.add(r.make(id,{x:2,z:2}));const mug=r.make('tavmug',{p:owner.id,lx:0,lz:0});assert.ok(r.canPlace(mug),id);
 }
 for(const id of ['tavchair','tavbench','tavbed'])assert.ok(LR.CAT[id].seat>0);
 const c=LR.CAT.tavlamp;assert.equal(c.tap,'toggle');assert.ok(c.light);for(const on of [true,false]){const m=new LR.Model();c.build(m,c.vars[0],{on});assert.equal([...m.parts.main.vox.values()].some(v=>!!(v & LR.GLOW)),on);}
});
