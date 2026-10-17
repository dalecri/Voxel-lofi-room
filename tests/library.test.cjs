const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../library.js'),LR=require('../room.js'),W=require('../widgets.js');require('../furniture.js');
function fixture(){const data=new Map(),store={get:(k,d)=>structuredClone(data.get(k)??d),set:(k,v)=>data.set(k,structuredClone(v))},letters=[],ideas=[];let time=new Date(2026,9,16,14);const options={store,letters:()=>letters,ideas:()=>ideas,now:()=>time};return {store,data,letters,ideas,options,model:B.create(options),time:d=>time=d};}
test('unified library reads current source models newest first with stable labels and no copied source storage',()=>{
 const f=fixture();f.letters.push({id:'a',title:'A letter',body:'<b>Hello</b>',letterhead:'Room',createdAt:100});f.ideas.push({id:'b',text:'An idea',createdAt:200});const n=f.model.addNote('A note');
 assert.deepEqual(f.model.entries().map(e=>e.kind),['NOTE','IDEA','LETTER']);assert.equal(f.model.entries()[2].text,'<b>Hello</b>');assert.equal(f.model.entries()[0].id,'note:'+n.id);
 f.ideas.push({id:'c',text:'New idea',createdAt:+new Date(2027,0,1)});assert.equal(f.model.entries()[0].id,'idea:c');assert.ok(!JSON.stringify(f.data.get(B.KEY)).includes('Hello'));assert.equal(f.data.size,1);
});
test('quick notes insert newest, title and stable bookmark persist, missing bookmark falls back to the first plus page',()=>{
 const f=fixture();assert.equal(f.model.title,'My Library');assert.equal(f.model.pages()[0].id,'compose');assert.equal(f.model.resume(),'compose');const n=f.model.addNote('Keep this');f.model.rename('My quiet library');f.model.mark('compose');
 const restored=B.create(f.options);assert.equal(restored.title,'My quiet library');assert.equal(restored.resume(),'note:'+n.id);assert.equal(restored.pages()[1].text,'Keep this');assert.throws(()=>restored.addNote('  '));assert.throws(()=>restored.rename('  '));
 f.letters.push({id:'gone',createdAt:100});restored.mark('letter:gone');f.letters.length=0;assert.equal(restored.resume(),'compose');
});
test('pressed flower page appears for a quick note from exactly this date last year, and leaves other dates alone',()=>{
 const f=fixture();f.time(new Date(2025,9,16,14));f.model.addNote('Autumn light');f.time(new Date(2026,9,16,14));const pages=f.model.pages();assert.equal(pages[1].memory,true);assert.equal(pages[1].kind,'NOTE');assert.equal(pages[1].text,'Autumn light');
 f.time(new Date(2026,9,17,14));assert.ok(!f.model.pages().some(p=>p.memory));f.time(new Date(2027,9,16,14));assert.ok(!f.model.pages().some(p=>p.memory));
});
test('lectern builds all wood variants and share round-trip keeps the piece without title, notes, bookmark or source content',()=>{
 const f=fixture(),C=LR.CAT.lectern;assert.equal(C.tap,'library');assert.equal(C.kind,'floor');assert.equal(C.vars.length,3);for(const vars of C.vars){const art=new LR.Model();C.build(art,vars,{});assert.ok(art.parts.main.vox.size>100);}
 f.model.rename('PRIVATE_LIBRARY');f.model.addNote('PRIVATE_NOTE');const room=new LR.Room();room.items=[];room.add(room.make('lectern',{x:2,z:2}));const raw=JSON.stringify(W.shareDecor({...room.serialize(),library:f.data.get(B.KEY)}));assert.ok(!raw.includes('PRIVATE'));assert.ok(!raw.includes('bookmark'));const imported=new LR.Room();assert.ok(imported.load(JSON.parse(raw)));assert.equal(imported.items[0].t,'lectern');
});
