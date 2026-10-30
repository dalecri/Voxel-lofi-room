const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../room.js'),L=require('../lane.js'),S=require('../shop.js');
require('../furniture.js');require('../scene.js');require('../packs/doors.js');S.register(R);require('../room-tools.js').register(R);
test('public interiors have collision-free furniture, a way home and working service anchors',()=>{
 for(const place of ['shop','mail'])for(const date of ['2026-10-30','2026-11-01','2026-11-03']){
  const shelf=L.shelf({catalog:S.allCatalog,date}),stock=[...shelf.items,...(shelf.special?[shelf.special]:[])].map(id=>S.allCatalog.find(i=>i.id===id));
  const {data,actions}=L.interior(R,place,stock),room=new R.Room();assert(room.load(data));
  assert.equal(room.n,14);assert(R.WALL_COLORS[room.wall.color]);assert(Object.values(actions).includes('home'));
  assert(Object.values(actions).includes(place));
  for(const it of room.items){assert(room.canPlace(it,it.id),place+': '+it.t);const m=new R.Model();R.CAT[it.t].build(m,R.CAT[it.t].vars[it.c||0],it);assert(Object.values(m.parts).some(p=>p.vox.size),it.t);}
  assert(room.items.some(i=>i.t===(place==='shop'?'merchantcat':'morningpaper')));
  assert(Object.keys(actions).every(id=>room.get(+id)));
 }
});
test('an empty shop still has Mallow and a browsable counter; invalid destinations are rejected',()=>{
 const {data,actions}=L.interior(R,'shop');assert(data.items.some(i=>i.t==='merchantcat'));assert(Object.values(actions).filter(a=>a==='shop').length>=2);assert.throws(()=>L.interior(R,'unknown'));
});
