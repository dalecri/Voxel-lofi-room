const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../pixel-maker.js'),T=require('../room-tools.js'),LR=require('../room.js'),W=require('../widgets.js');require('../furniture.js');T.register(LR);
const fixture=()=>{const data={},store={get:(k,d)=>structuredClone(data[k]??d),set:(k,v)=>data[k]=structuredClone(v)};return {store,m:T.create({store})};};
test('pixel brush sizes, eraser, flood fill and horizontal mirror paint the right cells',()=>{
 for(const size of [1,2,3]){const {m}=fixture();m.pixels.paint(5,5,{size,color:2});m.pixels.end();assert.equal(m.pixels.grid.cells.filter(c=>c===2).length,size*size);}
 const {m}=fixture(),p=m.pixels;p.paint(2,4,{color:3,mirror:true});p.end();assert.equal(p.grid.cells[4*16+2],3);assert.equal(p.grid.cells[4*16+13],3);p.paint(2,4,{tool:'eraser',mirror:true});p.end();assert.ok(p.grid.cells.every(c=>c===-1));
 p.begin();for(let y=0;y<16;y++)p.paint(8,y,{color:1});p.end();p.paint(0,0,{tool:'fill',color:5});p.end();assert.equal(p.grid.cells.filter(c=>c===5).length,8*16);assert.equal(p.grid.cells.filter(c=>c===1).length,16);assert.equal(p.grid.cells.filter(c=>c===-1).length,7*16);
});
test('one gesture is one undo; redo, clear, resize and new edits follow normal history semantics',()=>{
 const {m,store}=fixture(),p=m.pixels;p.begin();for(let x=1;x<6;x++)p.paint(x,2,{color:4});p.end();assert.equal(p.grid.cells.filter(c=>c===4).length,5);p.undo();assert.ok(p.grid.cells.every(c=>c<0));p.redo();assert.equal(p.grid.cells.filter(c=>c===4).length,5);p.resize(32);assert.equal(p.grid.cells.length,1024);assert.equal(p.grid.cells.filter(c=>c===4).length,20);p.undo();assert.equal(p.grid.size,16);p.clear();assert.ok(p.grid.cells.every(c=>c<0));p.undo();assert.equal(p.grid.cells.filter(c=>c===4).length,5);p.paint(0,0,{color:6});p.end();assert.equal(p.canRedo,false);assert.deepEqual(T.create({store}).pixels.grid,p.grid);
});
test('hang creates a real wall print, binds a frozen private grid and leaves room shares clean',()=>{
 const {m}=fixture(),room=new LR.Room();room.items=[];m.pixels.paint(1,1,{color:10});m.pixels.end();const it=P.hang(room,123,m.pixels.grid,(r,id,g)=>m.pinPixel(r,id,g),LR);assert.equal(LR.CAT[it.t].kind,'wall');assert.ok(room.items.includes(it));assert.equal(m.pixelPoster(123,it.id).cells[17],10);m.pixels.clear();assert.equal(m.pixelPoster(123,it.id).cells[17],10);const shared=W.shareDecor({...room.serialize(),pixel:m.state.pixel,pixelPosters:m.state.pixelPosters});assert.equal(shared.items[0].t,'pixelposter');assert.ok(!JSON.stringify(shared).includes('cells'));assert.ok(!('pixelPosters' in shared));
});
test('bad stored grids normalize to a bounded palette and brush ignores out-of-bounds cells',()=>{
 const g=P.normalize({size:99,cells:[50,'red',2]});assert.equal(g.size,16);assert.deepEqual(g.cells.slice(0,3),[-1,-1,2]);const {m}=fixture();m.pixels.paint(-1,3);m.pixels.paint(99,3);assert.equal(m.pixels.end(),false);assert.ok(m.pixels.grid.cells.every(c=>c<0));
});
