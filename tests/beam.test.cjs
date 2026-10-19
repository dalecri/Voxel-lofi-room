const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../room.js');require('../furniture.js');const W=require('../widgets.js');
const ys=(type,v=0,s={on:true})=>{const m=new L.Model();L.CAT[type].build(m,L.CAT[type].vars[v],s);const out=[];for(const p of Object.values(m.parts))for(const k of p.vox.keys())out.push(L.Model.decode(k)[1]);return out;};
test('ceiling beam builds in every variant and places in both directions on a 14-cell plot',()=>{
 const C=L.CAT.beam;assert.equal(C.kind,'floor');assert.deepEqual(C.size,[4,1]);assert.equal(C.group,L.CAT.eaves.group);assert.equal(C.tap,undefined);assert.equal(C.vars.length,3);
 for(let v=0;v<C.vars.length;v++)assert.ok(ys('beam',v).length>200,'variant '+v);
 for(const [r,x,z,fp] of [[0,1,3,[4,1]],[1,6,2,[1,4]],[2,9,10,[4,1]],[3,12,8,[1,4]]]){const room=new L.Room();room.n=14;const it=room.make('beam',{x,z,r});assert.deepEqual(L.fp(it),fp);assert.ok(room.canPlace(it),'rotation '+r);room.add(it);}
});
test('the beam underside sits exactly where pendant lamps hang from (LR.HANG)',()=>{
 assert.equal(L.HANG,L.HC*L.V);
 for(let v=0;v<L.CAT.beam.vars.length;v++)assert.equal(Math.min(...ys('beam',v)),L.HANG);
 for(const on of [true,false])assert.equal(Math.max(...ys('pendantlamp',0,{on}))+1,L.HANG,'pendant canopy top');
});
test('pendants and furniture can sit under a beam, beams cannot overlap each other',()=>{
 const room=new L.Room();room.n=14;const beam=room.add(room.make('beam',{x:2,z:5}));
 assert.ok(room.canPlace(room.make('pendantlamp',{x:3,z:5})),'pendant under the beam');
 assert.ok(room.canPlace(room.make('desk',{x:2,z:5})),'furniture under the beam');
 assert.equal(room.canPlace(room.make('beam',{x:4,z:5})),false,'overlapping beam');
 assert.equal(room.canPlace(room.make('beam',{x:4,z:4,r:1})),false,'crossing beam');
 assert.ok(room.canPlace(room.make('beam',{x:2,z:6})),'a neighbouring beam');
 assert.equal(room.walkGrid()[5*14+3],1,'cats can walk under it');assert.ok(beam);
});
test('beams travel in the shared room payload and load back unchanged',()=>{
 const room=new L.Room();room.n=14;room.add(room.make('beam',{x:2,z:5,c:1}));room.add(room.make('beam',{x:9,z:2,r:1,c:2}));room.add(room.make('pendantlamp',{x:3,z:5}));
 const back=new L.Room();assert.ok(back.load(JSON.parse(JSON.stringify(W.shareDecor(room.serialize())))));
 assert.deepEqual(back.items.filter(i=>i.t==='beam').map(i=>[i.x,i.z,i.r|0,i.c|0]),[[2,5,0,1],[9,2,1,2]]);
});
