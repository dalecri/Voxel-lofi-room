const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../room-tools.js'),L=require('../room.js'),W=require('../widgets.js');require('../furniture.js');require('../scene.js');
function fixture(){const data={};let date=new Date(2026,9,15,14);const store={get:(k,d)=>structuredClone(data[k]??d),set:(k,v)=>data[k]=structuredClone(v)};const reload=()=>T.create({store,now:()=>date,random:()=>.25});return {data,store,reload,model:reload(),at:d=>date=new Date(d),advance:n=>date=new Date(+date+n)};}
test('future letters validate local dates, stay sealed, arrive once across reload and survive clock rollback',()=>{
 const f=fixture(),m=f.model;
 for(const deliverOn of ['2026-02-30','2026-10-15','bad'])assert.throws(()=>m.send({body:'note',deliverOn}));
 const l=m.send({title:'Private future',body:'PRIVATE_FUTURE',html:'<b>PRIVATE_FUTURE</b>',deliverOn:'2026-10-16'});
 assert.equal(m.read(l.id),null);assert.equal(f.reload().state.mail[0].status,'sealed');
 f.at('2026-10-16T00:00:00');assert.deepEqual(m.poll(false),{mail:[],tea:false});assert.equal(m.state.mail[0].status,'arrived');
 assert.deepEqual(f.reload().poll().mail,[l.id]);assert.deepEqual(f.reload().poll().mail,[]);
 const read=f.reload().read(l.id);assert.equal(read.html,'<b>PRIVATE_FUTURE</b>');f.at('2026-10-15T14:00:00');assert.ok(f.reload().read(l.id));
});
test('grocery items can be checked, reopened, cleared and removed without changing room state',()=>{
 const f=fixture(),m=f.model;m.addGrocery('  PRIVATE_MILK ');m.addGrocery('Eggs');const [a,b]=m.state.groceries;
 m.checkGrocery(a.id,true);assert.equal(f.reload().state.groceries[0].done,true);m.clearGroceries();assert.deepEqual(m.state.groceries.map(g=>g.text),['Eggs']);m.remove('groceries',b.id);assert.equal(f.reload().state.groceries.length,0);assert.throws(()=>m.addGrocery(' '));
 assert.deepEqual(Object.keys(f.data),['lr.tools']);
});
test('idea shake handles empty/single jars, avoids repeats, persists selections and never mutates text',()=>{
 const f=fixture(),m=f.model;assert.equal(m.shake(),null);m.addIdea('PRIVATE_IDEA');assert.equal(m.shake().text,'PRIVATE_IDEA');m.addIdea('Another app');
 const first=m.shake(),second=m.shake();assert.notEqual(first.id,second.id);assert.equal(f.reload().state.lastIdea,second.id);assert.equal(m.state.ideas.length,2);
});
test('tea uses an absolute deadline through reload/background, rings once, and supports cancel/rebrew',()=>{
 const f=fixture(),m=f.model;assert.throws(()=>m.brew(0));assert.throws(()=>m.brew(31));m.brew(3);f.advance(61000);assert.equal(f.reload().remaining,119000);
 f.advance(120000);assert.equal(f.reload().poll(false).tea,false);assert.equal(f.reload().tea.status,'ready');assert.equal(f.reload().poll().tea,true);assert.equal(f.reload().poll().tea,false);
 m.cancelTea();assert.equal(m.poll().tea,false);m.brew(1);f.advance(60000);assert.equal(m.poll().tea,true);m.enjoyTea();assert.equal(f.reload().tea.status,'done');
});
test('savings logs exact cents, goal changes retain deposits, removals undo entries and over-goal fill is capped',()=>{
 const f=fixture(),m=f.model;assert.throws(()=>m.deposit('10'));m.goal('PRIVATE_GOAL','1.00');m.deposit('0.10','PRIVATE_DEPOSIT');m.deposit('0.20');assert.equal(m.total(),30);assert.equal(f.reload().total(),30);assert.equal(m.visual.level,3);
 m.goal('PRIVATE_GOAL','2.00');assert.equal(m.total(),30);for(const v of ['0','-1','1.005','x','1e5','Infinity'])assert.throws(()=>m.deposit(v));m.deposit('2,00');assert.equal(m.total(),230);assert.equal(m.visual.level,8);
 m.remove('deposits',m.state.deposits[0].id);assert.equal(m.total(),30);assert.equal(T.amount(m.total()),'0.30');assert.equal(T.cents('000.01'),1);
});
test('private pixels replace the retired stroke format and persist across reloads',()=>{
 const f=fixture();f.data['lr.tools']={v:1,next:1,strokes:[{color:'#443c34',points:[[0,0]]}],ideas:[{id:'kept',text:'Keep this idea'}]};const m=f.reload();assert.ok(!('strokes' in f.data['lr.tools']));assert.equal(m.state.ideas[0].text,'Keep this idea');m.pixels.paint(3,4,{color:5});m.pixels.end();assert.equal(f.reload().pixels.grid.cells[4*16+3],5);assert.equal(m.pixels.undo(),true);assert.equal(m.pixels.grid.cells[4*16+3],-1);m.pixels.redo();assert.equal(m.pixels.grid.cells[4*16+3],5);
});
test('free furniture definitions, inherited fridge skins, and share privacy remain separate from tools',()=>{
 T.register(L);for(const type of ['letterbox','ideajar','savingsjar','sketchbook']){const C=L.CAT[type],m=new L.Model();C.build(m,C.vars[0]);assert.ok(Object.values(m.parts).some(p=>p.vox.size));assert.equal(C.shop,undefined);}
 assert.equal(T.kind({t:'shopicebox'},{tap:'door',name:'Sage tall icebox'}),'groceries');
 const f=fixture();f.model.addIdea('PRIVATE_IDEA');f.model.pixels.paint(1,1,{color:3});f.model.pixels.end();
 const d=W.shareDecor({name:'Tools',n:10,tools:f.model.state,letters:{body:'PRIVATE_MAIL'},items:[{id:1,t:'savingsjar',x:2,z:2,tools:f.model.state,amount:'PRIVATE_AMOUNT'}]});assert.equal(d.items[0].t,'savingsjar');assert.ok(!JSON.stringify(d).includes('PRIVATE'));assert.ok(!('tools' in d));
});
test('tea dial maps every minute clockwise and presets keep their familiar steep lengths',()=>{
 assert.deepEqual(T.TEA_PRESETS.map(p=>p.minutes),[2,3,5]);
 for(let n=1;n<=10;n++){const a=n/10*Math.PI*2,minute=T.dialMinutes(Math.sin(a),-Math.cos(a));assert.equal(minute,n);const f=fixture();f.model.brew(minute);assert.equal(f.model.tea.minutes,n);assert.equal(f.model.remaining,n*60000);}
});
test('tea focus presentation derives buttons, mascot and bounded progress without changing the timer model',()=>{
 const f=fixture(),m=f.model;let d=T.teaDisplay(m.tea,m.remaining,2);assert.equal(d.state,'idle');assert.equal(d.label,'Brew tea');assert.equal(d.preset,'Green tea');assert.equal(d.readout,'2 MINS');assert.equal(d.mascot,'calm');
 m.brew(2);d=T.teaDisplay(m.tea,m.remaining);assert.equal(d.label,'Cancel steep');assert.equal(d.mascot,'watching');assert.equal(d.progress,0);f.advance(60000);d=T.teaDisplay(m.tea,m.remaining);assert.equal(d.progress,.5);assert.equal(d.readout,'1:00');
 const before=m.state;T.teaDisplay(m.tea,m.remaining);assert.deepEqual(m.state,before);f.advance(60000);assert.equal(m.poll().tea,true);d=T.teaDisplay(m.tea,m.remaining);assert.equal(d.label,'Enjoy the tea');assert.equal(d.mascot,'happy');assert.equal(d.progress,1);assert.equal(d.note,'Your tea is ready.');assert.equal(m.poll().tea,false);
 m.enjoyTea();d=T.teaDisplay(m.tea,m.remaining,2);assert.equal(d.state,'done');assert.equal(d.label,'Brew tea');assert.equal(d.mascot,'calm');assert.equal(d.progress,0);m.brew(3);m.cancelTea();assert.equal(T.teaDisplay(m.tea,m.remaining).state,'idle');
});
test('idea cards present newest-first, cycle, reveal the next after removal and keep model shake semantics',()=>{
 const f=fixture(),m=f.model;assert.equal(T.ideaCards(m.state.ideas).top,null);assert.deepEqual(T.ideaCards(m.state.ideas).behind,[]);
 for(const text of ['First spark','Second spark','Newest spark']){m.addIdea(text);f.advance(1000);}const snapshot=m.state;let c=T.ideaCards(m.state.ideas);assert.equal(c.top.text,'Newest spark');assert.equal(c.next.text,'Second spark');assert.equal(c.behind.length,2);assert.deepEqual(m.state,snapshot);
 const a=m.shake();c=T.ideaCards(m.state.ideas,a.id);assert.equal(c.top.id,a.id);assert.equal(m.state.lastIdea,a.id);const b=m.shake();assert.notEqual(b.id,a.id);assert.equal(T.ideaCards(m.state.ideas,b.id).top.id,b.id);assert.equal(m.state.lastIdea,b.id);
 const next=c.next.id;m.remove('ideas',c.top.id);assert.equal(T.ideaCards(m.state.ideas,next).top.id,next);while(m.state.ideas.length)m.remove('ideas',m.state.ideas[0].id);assert.equal(T.ideaCards(m.state.ideas,'gone').count,0);assert.equal(T.ideaCards(m.state.ideas).next,null);
});
test('idea stack limits peeking cards, preserves full text and uses the saved added date',()=>{
 const f=fixture(),m=f.model;for(let i=0;i<8;i++)m.addIdea('PRIVATE_LONG_IDEA\n'+('A thought. '.repeat(100))+i);const c=T.ideaCards(m.state.ideas);assert.equal(c.count,8);assert.equal(c.behind.length,3);assert.equal(c.top.text,m.state.ideas[0].text);assert.ok(T.ideaAdded(c.top).startsWith('Added 15 '));assert.equal(T.ideaAdded({}),'Kept in your jar');
});
test('mailbox compose window: From defaults and persists, Subject becomes the envelope title, drafts round-trip and Send clears them',()=>{
 const f=fixture(),m=f.model;let c=m.compose();
 assert.equal(c.from,'crisdalessio@gmail.com');assert.equal(c.to,'Future me');assert.equal(c.subject,'A note for future me');assert.equal(c.body,'');assert.equal(c.deliverOn,'2026-10-22');assert.equal(c.draft,false);
 m.setFrom('  PRIVATE_SENDER@example.com ');assert.equal(f.reload().compose().from,'PRIVATE_SENDER@example.com');
 const d={from:'PRIVATE_SENDER@example.com',to:'Me in winter',subject:'PRIVATE_SUBJECT',body:'PRIVATE_DRAFT\nsecond line',deliverOn:'2026-11-01'};m.saveDraft(d);
 c=f.reload().compose();for(const k of Object.keys(d))assert.equal(c[k],d[k]);assert.equal(c.draft,true);
 m.saveDraft({...d,deliverOn:'2026-10-15'});assert.equal(f.reload().compose().deliverOn,'2026-10-22');                 // a stale date falls back to a week out
 for(const deliverOn of ['2026-10-15','2026-10-14'])assert.throws(()=>m.send({title:d.subject,body:d.body,deliverOn,from:d.from,to:d.to}),/future date/);
 assert.ok(f.reload().mailDraft,'a failed send keeps the draft');
 const l=f.reload().send({title:d.subject,body:d.body,deliverOn:'2026-10-16',from:d.from,to:d.to});
 assert.equal(l.title,'PRIVATE_SUBJECT');assert.equal(l.from,'PRIVATE_SENDER@example.com');assert.equal(l.to,'Me in winter');assert.equal(l.status,'sealed');
 const after=f.reload();assert.equal(after.mailDraft,null);c=after.compose();assert.equal(c.draft,false);assert.equal(c.from,'PRIVATE_SENDER@example.com');assert.equal(c.subject,'A note for future me');assert.equal(c.body,'');
 assert.equal(f.reload().send({body:'x',deliverOn:'2026-10-20'}).title,'A note for future me');assert.deepEqual(Object.keys(f.data),['lr.tools']);
});
