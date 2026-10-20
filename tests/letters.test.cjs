const {test}=require('node:test');
const assert=require('node:assert/strict');
const L=require('../letters.js'),W=require('../widgets.js');
function fixture(){const values={};const store={get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}};let now=new Date(2026,9,15,14);const reload=()=>L.create({store,now:()=>now,clean:html=>html});return {store,values,reload,model:reload(),tick:()=>now=new Date(+now+1000)};}
test('private letter drafts keep formatting, editable letterheads and selection across reloads',()=>{
 const f=fixture();assert.equal(f.values[L.KEY],undefined);const a=f.model.add('Lofi Study');
 assert.ok(a.letterhead.startsWith('Lofi Study · '));
 f.model.update({letterhead:'A little note from home',body:'Dear <b>friend</b>, <i>hello</i> <u>again</u>.'});
 const reloaded=f.reload();assert.equal(reloaded.current,a.id);assert.equal(reloaded.get().body,'Dear <b>friend</b>, <i>hello</i> <u>again</u>.');assert.equal(reloaded.get().letterhead,'A little note from home');
 const copy=reloaded.get();copy.body='unpersisted';assert.notEqual(reloaded.get().body,copy.body);
 assert.deepEqual(Object.keys(f.values),['lr.letters']);
});
test('a subject title saves on the letter and the letter store stays letters-only',()=>{
 const f=fixture(),a=f.model.add('Room');
 f.model.update({letterhead:a.letterhead,body:'<b>hi</b>',title:'  For later  '});
 const saved=f.reload().get();
 assert.equal(saved.title,'For later');
 assert.deepEqual(Object.keys(saved).sort(),['body','cardIcon','createdAt','deliverIn','id','letterhead','title','updatedAt']);
 f.model.update({letterhead:saved.letterhead,body:saved.body});
 assert.equal(f.model.get().title,'For later');
 f.model.update({letterhead:saved.letterhead,body:'x',title:'   '});
 assert.equal(f.model.get().title,'Untitled letter');
 assert.deepEqual(Object.keys(f.values),['lr.letters']);
});
test('letters list creates unique IDs, renames, switches, deletes and persists an empty stack',()=>{
 const f=fixture(),a=f.model.add('Study'),b=f.model.add('Study');assert.notEqual(a.id,b.id);
 assert.ok(f.model.rename(a.id,'For a friend'));assert.ok(f.model.select(a.id));assert.equal(f.reload().get().title,'For a friend');
 assert.equal(f.model.select('missing'),false);assert.equal(f.model.remove('missing'),false);
 f.model.remove(a.id);assert.equal(f.model.current,b.id);f.model.remove(b.id);assert.equal(f.reload().get(),undefined);
 const next=f.reload().add('Study');assert.ok(next.id!==a.id && next.id!==b.id);
});
test('standalone HTML has inline paper styles, UTF-8, escaped metadata and semantic formatting',()=>{
 const html=L.htmlFile({title:'<script>PRIVATE_TITLE</script>',letterhead:'Dear <friend> & family',body:'<b>Bonjour</b> <i>café</i> <u>♥</u>'},v=>v);
 assert.ok(html.startsWith('<!doctype html>'));assert.ok(html.includes('<style>'));assert.ok(html.includes('<meta charset="utf-8">'));
 assert.ok(html.includes('&lt;script&gt;PRIVATE_TITLE&lt;/script&gt;'));assert.ok(html.includes('Dear &lt;friend&gt; &amp; family'));assert.ok(html.includes('<b>Bonjour</b> <i>café</i> <u>♥</u>'));
 assert.ok(html.includes("default-src 'none'"));assert.ok(!html.includes('<script>'));
 assert.equal(L.day(new Date(2026,9,15,23,59)),'2026-10-15');
});
test('decor projection strips letter data at every shared boundary without reading local storage',()=>{
 const data=W.shareDecor({v:1,name:'Study',n:10,wall:{style:'paint'},floor:{style:'wood'},letters:{body:'PRIVATE_LETTER_BODY'},items:[{id:1,t:'vintagetypewriter',x:2,z:2,letter:'PRIVATE_LETTER_BODY',draft:{letterhead:'PRIVATE_HEAD'}}]});
 assert.equal(data.items[0].t,'vintagetypewriter');assert.ok(!JSON.stringify(data).includes('PRIVATE'));
});
test('unavailable storage reports failure instead of claiming the draft was saved',()=>{
 const model=L.create({store:{get:(k,d)=>d,set:()=>{}},clean:v=>v});
 assert.throws(()=>model.add('Room'),/Could not save/);assert.equal(model.get().title,'Untitled letter');
});
test('writing gain stays quiet through ducking, restores on close, and typing effects respect mute',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../sound.js'),'utf8'),ctx);
 const s=ctx.window.LofiSound,calls=[];s.ctx={currentTime:10,state:'running'};s.band={gain:{cancelScheduledValues:()=>{},setTargetAtTime:(...a)=>calls.push(a)}};s.music=true;
 s.setWriting(true);assert.equal(calls.at(-1)[0],.32);s.duck();assert.equal(calls.at(-1)[0],.32);assert.ok(s.music);
 s.setWriting(false);assert.equal(calls.at(-1)[0],.9);s.music=false;s.setWriting(true);assert.equal(calls.at(-1)[0],0);
 s.on=false;s.tone=()=>assert.fail('muted typing tone');s.soft=()=>assert.fail('muted carriage noise');s.clack(1,false);s.typeBell();s.carriageReturn();
});

test('each letter keeps its delivery choice and Send to future gets a real local date',()=>{
 const f=fixture(),a=f.model.add('Room');assert.equal(f.model.get().deliverIn,'month');
 f.model.update({letterhead:a.letterhead,body:'x',deliverIn:'week'});assert.equal(f.reload().get().deliverIn,'week');
 f.model.update({letterhead:a.letterhead,body:'x',deliverIn:'<bad>'});assert.equal(f.model.get().deliverIn,'week');
 const L=require('../letters.js'),from=new Date(2026,0,31,9);
 assert.deepEqual(['tomorrow','week','month','year'].map(k=>L.deliverDate(k,from)),['2026-02-01','2026-02-07','2026-03-03','2027-01-31']);
});
