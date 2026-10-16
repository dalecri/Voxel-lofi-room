const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../dashboard.js'),W=require('../widgets.js'),Letters=require('../letters.js'),LR=require('../room.js');
require('../furniture.js');require('../packs/library.js');W.register(LR);
function fixture(initial={}){const values=structuredClone(initial),store={get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}};const letters=Letters.create({store,clean:v=>v});const reload=()=>D.create({store,letters,now:()=>1792100000000});return {values,store,letters,model:reload(),reload};}
test('five menu tabs and three file categories have stable order and namespaces',()=>{
 assert.deepEqual(D.MENU_TABS,['Today','Rooms','Journal','Sound','Settings']);assert.deepEqual(D.FILE_TABS,['Letters','Scenes','Photos']);
 assert.deepEqual(D.KEYS,{portals:'lr.portals',Letters:'lr.letters',Scenes:'lr.scenes',Photos:'lr.photos'});
});
test('launcher derives live catalog portal URLs and every widget destination without including travel doors',()=>{
 const f=fixture(),widgets=W.create({store:f.store});const rows=D.destinations(LR.CAT,widgets);
 for(const p of W.PORTALS)assert.ok(rows.some(r=>r.furnitureId===p.furnitureId && r.url===D.url(p.url)),p.label);
 assert.ok(rows.some(r=>r.url===W.POMODORO_URL));for(const p of W.TST_CONTENT.links)assert.ok(rows.some(r=>r.url===D.url(p.url)));
 const catalog={...LR.CAT,testportal:{name:'New app',tap:'portal',link:'https://example.com/new'},roomdoor:{tap:'portal',link:123},bad:{tap:'portal',url:'javascript:alert(1)'}};
 assert.ok(D.destinations(catalog,widgets).some(r=>r.label==='New app'));assert.ok(!D.destinations(catalog,widgets).some(r=>['roomdoor','bad'].includes(r.furnitureId)));
 assert.equal(D.destinations(catalog,widgets,[{label:'Duplicate',url:W.POMODORO_URL}]).filter(r=>r.url===W.POMODORO_URL).length,1);
});
test('custom portals and room-specific assignments persist privately and validate schemes',()=>{
 const f=fixture();for(const u of ['javascript:alert(1)','data:text/html,x','/relative','not a url'])assert.throws(()=>f.model.addPortal('Test',u));assert.throws(()=>f.model.addPortal(' ','https://example.com'));
 const p=f.model.addPortal('PRIVATE_APP','https://example.com/private');f.model.bind('room-a:1',p.id);assert.equal(f.reload().bound('room-a:1').url,p.url);assert.equal(f.reload().bound('room-b:1'),undefined);
 assert.equal(f.reload().custom[0].label,'PRIVATE_APP');assert.deepEqual(Object.keys(f.values),['lr.portals']);
});
test('file cabinet reads existing letters without creating a draft and supports shared editor mutations',()=>{
 const f=fixture();assert.equal(f.model.count,0);assert.deepEqual(f.model.list('Letters'),[]);assert.equal(f.values['lr.letters'],undefined);
 const l=f.letters.add('Room');f.letters.update({letterhead:'Private',body:'Hello <b>cozy friend</b>.'});assert.equal(f.model.list('Letters')[0].words,3);
 f.model.rename('Letters',l.id,'PRIVATE_LETTER');assert.equal(f.letters.get().title,'PRIVATE_LETTER');f.model.remove('Letters',l.id);assert.equal(f.letters.get(),undefined);
 const fallback=D.create({store:{get:()=>({letters:[{id:'old',title:'Existing',body:'Hello there'}]})}});assert.equal(fallback.list('Letters')[0].words,2);
});
test('scenes and photos save, rename, delete and survive reload without touching room storage',()=>{
 const f=fixture(),s=f.model.add('Scenes',{title:'PRIVATE_SCENE',decor:{name:'Cozy',items:[]}}),p=f.model.add('Photos',{title:'PRIVATE_PHOTO',data:'data:image/png;base64,AAAA'});
 assert.notEqual(s.id,p.id);assert.equal(f.reload().count,2);assert.equal(f.reload().list('Scenes')[0].decor.name,'Cozy');
 f.model.rename('Photos',p.id,'Another memory');assert.equal(f.reload().list('Photos')[0].title,'Another memory');assert.equal(f.model.remove('Scenes','missing'),false);f.model.remove('Scenes',s.id);assert.equal(f.reload().count,1);
 assert.deepEqual(Object.keys(f.values),['lr.scenes','lr.photos']);
});
test('share decor drops all file and custom-portal data at root and item boundaries',()=>{
 const f=fixture();f.letters.add('PRIVATE_LETTER');f.letters.update({body:'PRIVATE_BODY',letterhead:'PRIVATE_HEAD'});f.model.add('Scenes',{title:'PRIVATE_SCENE'});f.model.add('Photos',{data:'PRIVATE_PHOTO'});f.model.addPortal('PRIVATE_APP','https://example.com/PRIVATE');
 const privateData={letters:f.values['lr.letters'],scenes:f.values['lr.scenes'],photos:f.values['lr.photos'],portals:f.values['lr.portals']};
 const decor={v:1,name:'Room',n:10,wall:{style:'paint'},floor:{style:'wood'},...privateData,items:[{id:1,t:'filecab',x:2,z:2,...privateData},{id:2,t:'appportal',x:3,z:2,...privateData}]};
 const shared=W.shareDecor(decor);assert.equal(shared.items.length,2);assert.ok(!JSON.stringify(shared).includes('PRIVATE'));for(const k of Object.keys(privateData)){assert.ok(!(k in shared));assert.ok(!(k in shared.items[0]));}
 assert.deepEqual(W.shareDecor(shared),shared);
});
test('new furniture builds voxel meshes and cabinet filling stays on capture-hidden private parts',()=>{
 for(const t of ['phone','filecab','appportal']){const C=LR.CAT[t],m=new LR.Model();C.build(m,C.vars[0]);assert.ok(m.parts.main.vox.size);assert.equal(C.shop,undefined);if(t==='filecab')for(let i=0;i<3;i++)assert.ok(m.parts['privateFiles'+i].vox.size);}
 assert.equal(LR.CAT.phone.group,'tech');assert.equal(LR.CAT.phone.kind,'small');
});
test('failed writes never claim custom portals or files were saved',()=>{
 const model=D.create({store:{get:(k,d)=>d,set:()=>{}}});assert.throws(()=>model.addPortal('App','https://example.com'),/Could not save/);assert.throws(()=>model.add('Scenes',{title:'Room'}),/Could not save/);
});
