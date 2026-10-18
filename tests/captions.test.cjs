const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../captions.js');
const W=require('../widgets.js');
const fixture={exportedFrom:'TwoStoryCaptions',exportedAt:'2026-10-18T12:00:00Z',clips:[
 {id:'old',desc:'  My original words.\nSecond line.  ',status:'idea',created:'2026-10-15T12:00:00Z',selectedTones:['Relatable'],platform:'Both',captions:null},
 {id:'gone',desc:'Already published',status:'published',created:'2026-10-18T13:00:00Z',captions:['Done']},
 {id:'new',desc:'An idea',status:'draft',created:'2026-10-18T12:00:00Z',captions:['First caption','Second caption']}
],brands:[],tasks:[]};
function store(){const values={};return {values,get:(k,d)=>values[k]??d,set:(k,v)=>{values[k]=structuredClone(v);}};}
test('blank owner config hides the section and makes no requests',async()=>{
 let calls=0;const m=C.create({store:store(),url:'',fetcher:()=>{calls++;}});await m.refresh();assert.equal(m.state.enabled,false);assert.equal(calls,0);
 let emptied=false;const host={replaceChildren(){emptied=true;}};C.render(host,m);assert.equal(host.hidden,true);assert.equal(emptied,true);
 assert.match(C.CAPTIONS_URL,/\/raw\/twostorycaptions.json$/);
});
test('exact export shape: unpublished newest first, descriptions verbatim, null captions clean',()=>{
 const data=C.parse(fixture),rows=C.rows(data);assert.deepEqual(rows.map(c=>c.id),['new','old']);
 assert.equal(rows[1].desc,fixture.clips[0].desc);assert.deepEqual(rows[1].captions,[]);
 assert.deepEqual(rows[1].selectedTones,['Relatable']);assert.equal(rows[1].platform,'Both');
 assert.equal(C.copyPayload(rows[0]),'First caption');assert.equal(C.copyPayload(rows[1]),fixture.clips[0].desc);
 assert.equal(C.copyPayload({desc:'Idea',captions:[null,' ',{tone:'Relatable',text:'Exact text'},'Later']}),'Exact text');
 assert.equal(C.copyPayload({desc:'Idea',captions:[{caption:'Caption text'}]}),'Caption text');
});
test('cache carries exportedAt across reloads; failed HTTP, JSON and network retain last good data',async()=>{
 const s=store();let mode='ok',calls=0;
 const fetcher=async(url,init)=>{calls++;assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');if(mode==='throw')throw Error('offline');return {ok:mode!=='http',json:async()=>{if(mode==='json')throw SyntaxError('broken');return mode==='shape'?{wrong:true}:fixture;}};};
 const m=C.create({store:s,fetcher});await Promise.all([m.refresh(),m.refresh()]);assert.equal(calls,1);
 assert.equal(m.state.cached,false);assert.equal(s.values[C.KEY].data.exportedAt,fixture.exportedAt);
 for(const failure of ['http','json','shape','throw']){mode=failure;const reload=C.create({store:s,fetcher});assert.equal(reload.state.cached,true);await reload.refresh();assert.deepEqual(reload.state.rows.map(c=>c.id),['new','old']);assert.equal(reload.state.cached,true);assert.equal(reload.state.failed,true);}
 mode='ok';await m.refresh();assert.equal(m.state.failed,false);
});
test('malformed exports and cache fail softly; synchronous fetch errors remain retryable',async()=>{
 const s=store();s.values[C.KEY]={url:C.CAPTIONS_URL,data:{clips:[]}};
 for(const body of [null,{},[],{clips:[]},{exportedFrom:'TwoStoryCaptions',clips:'bad'}]){
  const m=C.create({store:s,fetcher:async()=>({ok:true,json:async()=>body})});await m.refresh();assert.equal(m.state.rows.length,0);assert.equal(m.state.failed,true);
 }
 let calls=0;const m=C.create({store:s,fetcher:()=>{calls++;throw Error('offline');}});await m.refresh();await m.refresh();assert.equal(calls,2);
});
test('clipboard API and legacy textarea fallback copy exact text; failure is reported',async()=>{
 let got;assert.equal(await C.copy('Hello\nworld',{navigator:{clipboard:{writeText:async s=>got=s}}}),true);assert.equal(got,'Hello\nworld');
 let removed=false,restored=false,selected=false;const area={style:{},setAttribute(){},focus(){},select(){selected=true;},setSelectionRange(){},remove(){removed=true;}};
 const doc={activeElement:{focus(){restored=true;}},createElement:()=>area,body:{appendChild(){}},execCommand:()=>true};
 assert.equal(await C.copy('Exact fallback',{navigator:{},document:doc}),true);assert.equal(area.value,'Exact fallback');assert.ok(selected&&removed&&restored);
 doc.execCommand=()=>false;assert.equal(await C.copy('Text',{navigator:{},document:doc}),false);
});
test('caption data is never included in shared decor',()=>{
 const shared=W.shareDecor({v:1,name:'Room',items:[],captionDesk:fixture,'lr.captionDesk':fixture});
 assert.ok(!JSON.stringify(shared).includes('My original words'));assert.ok(!JSON.stringify(shared).includes('First caption'));
});
