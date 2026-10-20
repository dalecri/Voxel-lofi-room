const {test}=require('node:test'),assert=require('node:assert/strict');
const Card=require('../mail-window.js'),Letters=require('../letters.js'),Tools=require('../room-tools.js'),Widgets=require('../widgets.js');
function fixture(){const values={};return {values,store:{get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}}};}
test('pixel card pictures are curated local art with a safe legacy fallback',()=>{
 assert.equal(Card.ICONS.length,6);assert.equal(Card.normalizeIcon('<img onerror=alert(1)>'),'tulips');
 for(const icon of Card.ICONS){assert.equal(Card.normalizeIcon(icon.id),icon.id);assert.match(Card.art(icon.id),/shape-rendering="crispEdges"/);assert.match(Card.art(icon.id),/<rect/);assert.ok(!/https:|script|foreignObject|href/.test(Card.art(icon.id)));}
 assert.equal(Card.art('missing'),Card.art('tulips'));
});
test('regular letters persist their picture independently and export it with the paper',()=>{
 const f=fixture(),options={store:f.store,clean:v=>v},m=Letters.create(options);let a=m.add('Room');
 m.update({...a,body:'<b>A private hello</b>',cardIcon:'cat'});a=m.get();
 const b=m.add('Room');m.update({...b,body:'Other note',cardIcon:'moon'});m.select(a.id);
 const reloaded=Letters.create(options);assert.equal(reloaded.get().cardIcon,'cat');assert.equal(reloaded.list().find(l=>l.id===b.id).cardIcon,'moon');
 assert.ok(Letters.htmlFile(a,v=>v).includes('<b>A private hello</b>'));assert.deepEqual(Object.keys(f.values),['lr.letters']);
});
test('future card draft, sealed snapshot and arrival retain the chosen picture across reloads',()=>{
 const f=fixture();let now=new Date(2026,9,18,12);const options={store:f.store,now:()=>now},m=Tools.create(options);
 m.saveDraft({subject:'Later',body:'Hello future me',deliverOn:'2026-10-20',cardIcon:'tea'});
 const restored=Tools.create(options);assert.equal(restored.compose().cardIcon,'tea');const l=restored.send({...restored.compose(),title:'Later'});
 assert.equal(l.cardIcon,'tea');assert.equal(restored.mailDraft,null);
 now=new Date(2026,9,20,12);const arrived=Tools.create(options).read(l.id);assert.equal(arrived.cardIcon,'tea');assert.equal(arrived.body,'Hello future me');
 assert.deepEqual(Object.keys(f.values),['lr.tools']);
 const shared=Widgets.shareDecor({v:1,name:'Room',n:10,wall:{style:'paint'},floor:{style:'oak'},mail:f.values['lr.tools'],letters:{cardIcon:'PRIVATE_ICON'},items:[]});assert.ok(!JSON.stringify(shared).includes('Hello future me'));assert.ok(!JSON.stringify(shared).includes('PRIVATE_ICON'));
});
