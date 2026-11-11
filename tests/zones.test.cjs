// node tests/zones.test.cjs. Zones: a finish of its own for any wall, floor rectangles with
// their own style, the partition pieces, and the save format staying compatible both ways.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const L=require('../room.js');require('../furniture.js');require('../scene.js');require('../packs/doors.js');
const Village=require('../village.js');
const room=()=>new L.Room();
test('an untouched room saves exactly as before: no zone fields at all',()=>{
 const r=room(),data=r.serialize();assert.equal('zones' in data,false);assert.equal('walls' in data,false);assert.equal(r.hasZones(),false);
 const old=room();assert.ok(old.load({v:1,name:'Old',n:10,wall:{style:'brick',color:0},floor:{style:'oak'},items:[]}));
 assert.deepEqual(old.zones,[]);assert.equal(old.walls,undefined);assert.equal(old.wallAt(2),old.wall);assert.equal(old.floorAt(3,3),'oak');
});
test('floor zones: later paint wins, covered zones are dropped, and the room style rubs zones out',()=>{
 const r=room();assert.ok(r.paintZone(9,9,5,0,'checker'),'corners in any order');
 assert.deepEqual(r.zones,[{x:5,z:0,w:5,d:10,style:'checker'}]);assert.equal(r.floorAt(5,0),'checker');assert.equal(r.floorAt(4,9),'oak');
 r.paintZone(7,2,8,3,'walnut');assert.equal(r.floorAt(7,2),'walnut');assert.equal(r.floorAt(6,2),'checker');assert.equal(r.zones.length,2);
 r.paintZone(4,0,9,9,'herring');assert.deepEqual(r.zones.map(z=>z.style),['herring'],'fully covered zones are gone');
 r.paintZone(0,0,9,9,'oak');assert.deepEqual(r.zones,[],'the room style over everything leaves no zones');
 r.paintZone(-4,-4,40,40,'walnut');assert.equal(r.floor.style,'walnut','a zone over the whole plot is just the floor');assert.deepEqual(r.zones,[]);
 assert.equal(r.paintZone(0,0,1,1,'not-a-floor'),false);
});
test('a floor holds a bounded number of zones',()=>{
 const r=room();r.n=24;let ok=true;for(let i=0;i<24&&ok;i++)ok=r.paintZone(i,0,i,0,i%2?'checker':'walnut');
 assert.ok(ok);assert.equal(r.zones.length,24);assert.equal(r.paintZone(0,5,0,5,'herring'),false);assert.equal(r.zones.length,24);
});
test('one wall at a time: its own style and colour, back to the room finish when they match',()=>{
 const r=room();assert.ok(r.paintWall(1,{style:'brick'}));assert.deepEqual(r.walls,[null,{style:'brick',color:0},null,null]);
 assert.ok(r.paintWall(0,{color:8}));assert.deepEqual(r.wallAt(0),{style:'paint',color:8});assert.equal(r.wallAt(3),r.wall);
 assert.ok(r.paintWall(1,{style:'paint'}));assert.equal(r.walls[1],null);assert.ok(r.paintWall(0,{color:0}));assert.equal(r.walls,undefined);
 assert.equal(r.paintWall(4,{style:'brick'}),false);assert.equal(r.paintWall(0,{style:'nope'}),false);assert.equal(r.paintWall(0,{color:99}),false);
 const open=room();open.wall={style:'none',color:0};assert.equal(open.paintWall(0,{style:'brick'}),false,'an open plot has no walls');
});
test('zones round-trip through the save, survive undo snapshots, and bad data is dropped on load',()=>{
 const r=room();r.paintZone(0,0,4,9,'checker');r.paintWall(1,{style:'brick',color:2});
 const text=r.snapshot(),copy=room();copy.restore(text);assert.equal(copy.snapshot(),text);assert.equal(copy.floorAt(0,0),'checker');assert.equal(copy.wallAt(1).style,'brick');
 const messy=room();assert.ok(messy.load({v:1,n:10,items:[],walls:[{style:'ghost',color:0},{style:'brick',color:99},'x',{style:'none',color:0}],
  zones:[{x:8,z:8,w:9,d:9,style:'checker'},{x:0,z:0,w:1,d:1,style:'ghost'},{x:1.5,z:0,w:1,d:1,style:'oak'},null,{x:20,z:0,w:2,d:2,style:'walnut'}]}));
 assert.deepEqual(messy.walls,[null,{style:'brick',color:0},null,null]);assert.deepEqual(messy.zones,[{x:8,z:8,w:2,d:2,style:'checker'}],'clipped to the plot');
});
test('templates, surprise rooms and a smaller plot keep zones tidy',()=>{
 const r=room();r.n=14;r.paintZone(8,0,13,13,'checker');r.paintWall(0,{color:3});
 r.n=10;r.fitZones();assert.deepEqual(r.zones,[{x:8,z:0,w:2,d:10,style:'checker'}]);
 L.PRESETS.study.make(r);assert.equal(r.hasZones(),false,'a template starts from one finish');
 r.paintZone(0,0,2,2,'checker');r.clearZones();assert.equal(r.hasZones(),false);
});
test('room cards notice a zone change, and the hash of an unzoned room is unchanged',()=>{
 const r=room(),before=Village.decorHash(r.serialize());assert.equal(before,JSON.stringify([10,'city','paint',0,'oak',null,null,[]]));
 r.paintZone(0,0,2,2,'checker');assert.notEqual(Village.decorHash(r.serialize()),before);
});
test('partition walls are full-height floor pieces that tuck away with the walls',()=>{
 const HV=L.HC*L.V;
 for(const [key,w] of [['partition',2],['partition1',1],['partitiondoor',2]]){
  const C=L.CAT[key];assert.equal(C.kind,'floor');assert.equal(C.group,'doors');assert.ok(C.partition);assert.deepEqual(C.size,[w,1]);
  for(const vars of C.vars){const m=new L.Model();C.build(m,vars);const ys=[...m.parts.main.vox.keys()].map(k=>L.Model.decode(k)[1]);assert.equal(Math.max(...ys),HV-1);assert.equal(Math.min(...ys),0);}
 }
 const door=new L.Model();L.CAT.partitiondoor.build(door,L.CAT.partitiondoor.vars[0]);const open=[...door.parts.main.vox.keys()].map(k=>L.Model.decode(k)).filter(([x,y])=>x>=3&&x<13&&y<26);assert.equal(open.length,0,'the doorway is an opening');
 assert.ok(L.CAT.partitiondoor.walk,'cats can walk through it');
 const half=L.CAT.halfwall;assert.equal(half.partition,undefined);assert.equal(half.top,22,'small things sit on a half wall');
 const r=room(),a=r.add(r.make('partition',{x:4,z:0,r:1}));assert.ok(r.canPlace(a,a.id));assert.equal(r.canPlace(r.make('partition1',{x:4,z:1}),0),false,'partitions take up floor');
});
test('the renderer reads zones for the live shell, the room cards and wall hiding',()=>{
 const src=fs.readFileSync(require.resolve('../render.js'),'utf8');
 assert.match(src,/JSON\.stringify\(\[room\.walls \|\| 0, room\.zones \|\| 0\]\)/,'the shell cache key follows zones');
 assert.match(src,/if \(this\.wallsHidden\) return 0;/);assert.match(src,/C\.partition && this\.wallsHidden/);
 assert.match(src,/data\.zones/);assert.match(src,/data\.walls/);
});
