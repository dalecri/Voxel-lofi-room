const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../room.js'),L=require('../lane.js'),S=require('../shop.js');
require('../furniture.js');require('../scene.js');require('../packs/doors.js');require('../packs/seasonal.js');require('../lane-street.js');S.register(R);require('../room-tools.js').register(R);
const builds=(room,place)=>{for(const it of room.items){assert(room.canPlace(it,it.id),place+': '+it.t);const m=new R.Model();R.CAT[it.t].build(m,R.CAT[it.t].vars[it.c||0],it);assert(Object.values(m.parts).some(p=>p.vox.size),it.t);}};
test('public interiors have collision-free furniture, a door out to the lane and working service anchors',()=>{
 for(const place of ['shop','mail'])for(const date of ['2026-10-30','2026-11-01','2026-11-03']){
  const shelf=L.shelf({catalog:S.allCatalog,date}),stock=[...shelf.items,...(shelf.special?[shelf.special]:[])].map(id=>S.allCatalog.find(i=>i.id===id));
  const {data,actions}=L.interior(R,place,stock),room=new R.Room();assert(room.load(data));
  assert.equal(room.n,14);assert(R.WALL_COLORS[room.wall.color]);assert(Object.values(actions).includes('street'));
  assert(Object.values(actions).includes(place));
  builds(room,place);
  assert(room.items.some(i=>i.t===(place==='shop'?'merchantcat':'morningpaper')));
  assert(Object.keys(actions).every(id=>room.get(+id)));
 }
});
test('an empty shop still has Mallow and a browsable counter; invalid destinations are rejected',()=>{
 const {data,actions}=L.interior(R,'shop');assert(data.items.some(i=>i.t==='merchantcat'));assert(Object.values(actions).filter(a=>a==='shop').length>=2);assert.throws(()=>L.interior(R,'unknown'));
});
test('the street: four fronts in Lane-tab order, each door on open pavement, and it builds cleanly',()=>{
 const {data,actions}=L.interior(R,'street',[],{residents:[{name:'Pepper',c:1,place:'notice'},{name:'Mochi',c:2,place:'house'}],season:'halloween'}),room=new R.Room();assert(room.load(data));
 assert.equal(room.wall.style,'none');builds(room,'street');
 const fronts=['lanehome','laneshop','lanepost','laneboard'].map(t=>room.items.find(i=>i.t===t));assert(fronts.every(Boolean));
 assert.deepEqual(fronts.map(f=>f.x),[...fronts.map(f=>f.x)].sort((a,b)=>a-b),'house, shop, mail, notice from left to right');
 assert.deepEqual(fronts.map(f=>actions[f.id]),['home','go:shop','go:mail','notice']);
 for(const f of fronts.slice(0,3)){const C=R.CAT[f.t];assert.equal(C.tap,'portal');const cell=[f.x+C.door,f.z+C.size[1]];
  const covers=i=>{const [w,d]=R.fp(i);return R.CAT[i.t].kind==='floor'&&i.x!=null&&cell[0]>=i.x&&cell[0]<i.x+w&&cell[1]>=i.z&&cell[1]<i.z+d;};
  assert(!room.items.some(covers),f.t+' door is clear');}
 const cats=room.items.filter(i=>i.t==='cat');assert.equal(cats.length,1,'pets at home stay home');assert.equal(cats[0].name,'Pepper');
 assert(room.items.some(i=>i.t==='pumpkins'),'Halloween dresses the street');
 assert(!L.interior(R,'street').data.items.some(i=>i.t==='pumpkins'));
 for(const p of ['house','shop','mail']){const o=L.outside(p),[x,,t]=L.STREET[p];assert(o.x>x&&o.x<x+3&&o.z>2,p);}
 assert(!R.GROUPS.some(g=>g[0]==='lane'),'street fronts never appear in the Add tray');
});
test('neighbours stand on the street with a talk action, and Mallow steps out of the shop in the mornings',()=>{
 const folks=L.neighbors({phase:'morning',weather:'rain'});const {data,actions}=L.interior(R,'street',[],{neighbors:folks}),room=new R.Room();assert(room.load(data));builds(room,'street');
 for(const t of ['lanemallow','lanereader','lanestray']){const it=room.items.find(i=>i.t===t);assert(it,t);assert.match(actions[it.id],/^talk:/);}
 assert(!L.interior(R,'shop',[],{mallowOut:true}).data.items.some(i=>i.t==='merchantcat'));
 const C=['lanehome','laneshop','lanepost'].map(t=>room.items.find(i=>i.t===t)).map(f=>[f.x+R.CAT[f.t].door,f.z+R.CAT[f.t].size[1]].join());
 for(const n of folks)assert(!C.includes(n.at.join()),n.id+' never blocks a door');
});
