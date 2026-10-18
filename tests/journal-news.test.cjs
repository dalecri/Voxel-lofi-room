const {test}=require('node:test');
const assert=require('node:assert/strict');
const {newspaper}=require('../life.js');
function fixture(){
 const values={}; const store={get:(k,d)=>values[k]??d,set:(k,v)=>{values[k]=JSON.parse(JSON.stringify(v));}};
 let clock=new Date(2026,9,18,15).getTime();
 const moments=[['tea','Tea time','Made a little cup of tea.'],['rain','Rain watcher','Watched the rain.']];
 return {values,store,now:()=>clock,setTime:v=>clock=v,moments};
}
test('Day N counts distinct active local days and survives diary pruning and reload',()=>{
 const f=fixture(), n=newspaper(f); n.record('tea');
 const cats=[{time:f.now(),cat:1,name:'Diego',text:'Inspected dinner.'},{time:f.now()-86400000,cat:2,text:'A nap.'}];
 assert.equal(n.edition(cats).day,2); assert.equal(n.edition(cats).day,2);
 assert.equal(newspaper(f).edition([]).day,2);
 f.setTime(f.now()+86400000); assert.equal(newspaper(f).edition([]).day,2);
 newspaper(f).record('rain'); assert.equal(newspaper(f).edition([]).day,3);
});
test('newest cat leads even when a moment is newer; newest moment leads without cats',()=>{
 const f=fixture(),n=newspaper(f);n.record('tea');f.setTime(f.now()+1000);n.record('rain');
 assert.equal(n.edition().lead.title,'Rain watcher');
 const cats=[{time:f.now()-500,cat:1,name:'Diego',text:'Supervised a shelf.'},{time:f.now()-900,cat:2,text:'Older nap.'}];
 const e=n.edition(cats);assert.equal(e.lead.text,'Supervised a shelf.');assert.equal(e.remaining.length,3);
 assert.equal(e.headline,'DIEGO: SUPERVISED A SHELF');assert.match(e.dek,/Supervised a shelf/);
});
test('section line omits empty feeds and counts no activity on empty days',()=>{
 const f=fixture(),n=newspaper(f); assert.deepEqual(n.edition().sections,[]);assert.equal(n.edition().day,0);
 n.record('tea');assert.deepEqual(n.edition().sections,['Little moments']);
 const cats=[{time:f.now(),text:'Napped.',cat:1}];assert.deepEqual(n.edition(cats).sections,['Little moments','The cats’ version']);
 f.setTime(f.now()+86400000);assert.deepEqual(n.edition([{...cats[0],time:f.now()}]).sections,['The cats’ version']);
});
test('reactions are stable for a lead across reloads',()=>{
 const f=fixture(),n=newspaper(f);n.record('tea');assert.equal(n.edition().reaction,newspaper(f).edition().reaction);
});
test('empty-day front page is warm and undated old discoveries are not fabricated',()=>{
 const f=fixture();f.values['lr.found']=['tea']; const e=newspaper(f).edition();
 assert.equal(e.lead,null);assert.equal(e.headline,'No news today. The presses rest.');assert.equal(e.day,0);assert.deepEqual(e.remaining,[]);
});
test('dated legacy daily moments are retained without becoming new discoveries',()=>{
 const f=fixture();f.values['lr.dailyLog']=[{id:'tea',date:'2026-10-18'},{id:'rain',date:'2026-10-17'}];
 const n=newspaper(f);assert.equal(n.edition().day,2);assert.equal(n.edition().lead.title,'Tea time');
 f.values['lr.dailyLog']=[];assert.equal(n.edition().day,2);
});
