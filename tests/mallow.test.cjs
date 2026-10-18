const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../shop.js'),Assets=require('../merchant-assets.js'),Life=require('../life.js'),Calendar=require('../calendar.js'),Digest=require('../digest.js'),Widgets=require('../widgets.js'),L=require('../room.js');
require('../furniture.js');require('../japan.js');S.register(L);
function fixture(){const db=new Map([['lr.fireflies',10000]]),store={get:(k,d)=>db.has(k)?structuredClone(db.get(k)):d,set:(k,v)=>db.set(k,structuredClone(v))};const now=()=>new Date('2026-10-18T12:00:00'),journal=Life.journal({store,now:()=>+now()}),calendar=Calendar.create({store,now});const options={store,today:()=>Calendar.day(now()),onTip:()=>{journal.tip(42);calendar.append('tip');}};return {db,store,options,journal,calendar,shop:S.create(options)};}
test('two daily exclusives are deterministic and cycle the entire pool before repeats',()=>{
 assert.equal(Assets.exclusives.length,12);const ids=[];
 for(let i=0;i<6;i++){const date=Calendar.day(new Date(2026,9,18+i)),a=Assets.travelingFor(date);assert.equal(a.length,2);assert.deepEqual(Assets.travelingFor(date),a);assert.deepEqual(Assets.travelingFor(date,()=>false),a);ids.push(...a.map(c=>c.id));}
 assert.equal(new Set(ids).size,12);assert.deepEqual(Assets.travelingFor('2026-10-24'),Assets.travelingFor('2026-10-18'));
 assert.ok(Assets.exclusives.every(c=>c.price>=60&&c.price<=180));
});
test('traveling wares skip owned exclusives, restore across reload and fall back to ordinary stock',()=>{
 const f=fixture(),options={...f.options,owns:f.shop.owns,catalog:S.catalog,exclusives:S.exclusives,now:()=>1000,random:()=>.5},m=Life.merchant(options);m.tick(200,true);assert.equal(m.wares.length,3);assert.equal(m.wares.filter(id=>S.exclusives.some(c=>c.id===id)).length,2);
 const picked=m.wares[0];assert.ok(f.shop.buy(picked));assert.ok(!m.wares.includes(picked));assert.equal(m.wares.filter(id=>S.exclusives.some(c=>c.id===id)).length,1);assert.deepEqual(Life.merchant(options).wares,m.wares);
 for(const c of S.exclusives)if(!f.shop.owns(c.id))assert.ok(f.shop.buy(c.id));assert.ok(m.wares.every(id=>S.catalog.some(c=>c.id===id)));assert.equal(m.wares.length,3);
});
test('each exclusive registers real variant art or a finish without modifying its base',()=>{
 for(const c of S.exclusives){if(c.piece){const C=L.CAT[c.piece];assert.equal(C.shop,c.id);assert.equal(C.name,c.name);const m=new L.Model();for(const on of [false,true])C.build(m,C.vars[0],{on});assert.ok(Object.values(m.parts).some(p=>p.vox.size));assert.notEqual(L.CAT[c.base].shop,c.id);}else {const F=(c.wall?L.WALLS:L.FLOORS)[c.wall||c.floor];assert.equal(F.shop,c.id);assert.ok(Number.isFinite(c.wall?F.fn(0,1,1):F.fn(1,1)));}}
});
test('tips are pure sinks, log a journal moment and appear in the weekly digest',()=>{
 const f=fixture();for(const n of [5,10,25])assert.ok(f.shop.tip(n));assert.equal(f.shop.balance,9960);assert.equal(S.create(f.options).balance,9960);assert.equal(f.journal.entries.length,3);assert.equal(f.journal.entries[0].text,'Mallow pocketed your tip and did a little spin.');assert.deepEqual(f.calendar.activity()[0].events,['tip','tip','tip']);assert.equal(f.db.get('lr.shopOwned'),undefined);assert.equal(f.shop.earnedToday,0);
 assert.ok(Digest.issue(new Date('2026-10-19T12:00:00'),{activity:f.calendar.activity()}).sections.some(s=>s.id==='generosity'&&s.body.includes('3 kind tips')));
 for(const invalid of [0,-5,15,NaN,'5'])assert.equal(f.shop.tip(invalid),false);const poor=S.create({store:{get:(k,d)=>k==='lr.fireflies'?4:d,set(){throw Error('must not spend');}},today:()=> '2026-10-18'});assert.equal(poor.tip(5),false);
});
test('gilding persists only on the paid room, clears with repaint, and can be bought again',()=>{
 const f=fixture(),a=new L.Room(),b=new L.Room();const beforeHash=require('../village.js').decorHash(a);assert.ok(f.shop.gild(a));assert.notEqual(require('../village.js').decorHash(a),beforeHash);assert.equal(f.shop.balance,9850);assert.ok(S.isGilded(a));assert.ok(!S.isGilded(b));assert.equal(f.shop.gild(a),false);const restored=new L.Room();restored.load(a.serialize());assert.ok(S.isGilded(restored));
 S.clearGild(a);assert.ok(!S.isGilded(a));assert.ok(f.shop.gild(a));assert.equal(f.shop.balance,9700);a.wall.color=3;assert.ok(!S.isGilded(a));assert.ok(f.shop.gild(b));assert.equal(f.shop.balance,9550);
 b.load(new L.Room().serialize());assert.ok(!S.isGilded(b));a.generate(123);assert.equal(a.gild,undefined);S.create(f.options).gild(a);Object.values(L.PRESETS)[0].make(a);assert.equal(a.gild,undefined);
});
test('ownership, tips, gilding and merchant state never enter room codes or add storage keys',()=>{
 const f=fixture(),room=new L.Room();f.shop.tip(5);f.shop.buy(S.exclusives[0].id);f.shop.gild(room);const shared=Widgets.shareDecor({...room.serialize(),merchant:{tips:5},shopOwned:f.db.get('lr.shopOwned'),activityLog:f.calendar.activity()});assert.ok(!('gild' in shared));assert.ok(!('merchant' in shared));assert.ok(!('shopOwned' in shared));assert.ok(!('activityLog' in shared));
 assert.deepEqual([...f.db.keys()].sort(),['lr.activityLog','lr.catJournal','lr.fireflies','lr.shopOwned'].sort());
});
