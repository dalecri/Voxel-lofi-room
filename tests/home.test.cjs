const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('../home.js'),W=require('../widgets.js');
const now=new Date(2026,9,16,14);
function fixture(values={}){const data=structuredClone({'lr.daily':{date:'2026-10-16',id:'tea',done:false},'lr.dailyStreak':{n:4},...values});return {data,store:{get:(k,d)=>structuredClone(data[k]??d)},now,meta:{phase:'day',weather:'rain',realtime:true},room:{items:[]}};}
test('Home sections derive local date, phase, weather, daily state and streak from fixture stores',()=>{
 const ctx=fixture(),s=H.snapshot(ctx);assert.deepEqual(s.sections,['Today','Gentle notifications','Control center','Search','Coziness status']);assert.equal(s.today.phase,'Afternoon');assert.equal(s.today.weather,'Rain');assert.equal(s.today.clock,'following the clock');assert.equal(s.today.daily.D.id,'tea');assert.equal(s.today.streak,4);assert.ok(s.today.date.includes('2026'));
 ctx.meta={phase:'night',weather:'snow',realtime:false};assert.equal(H.snapshot(ctx).today.clock,'your chosen daypart');assert.equal(H.snapshot(ctx).today.phase,'Night');assert.equal(H.snapshot(ctx).today.weather,'Snow');
});
test('gentle notifications derive tea-ready, undone daily, merchant and unread arrivals',()=>{
 const s=H.snapshot({...fixture(),merchant:true,tools:{tea:{status:'ready'},mail:[{status:'arrived',read:false},{status:'arrived',read:true},{status:'sealed',deliverOn:'2026-10-17',read:false}]}});
 assert.deepEqual(s.notifications.map(n=>n.target),['tea','daily','merchant','mailbox']);assert.equal(s.notifications[3].title,'A letter has arrived');assert.ok(s.today.waiting.includes('Tea is ready'));
 const f=fixture({'lr.daily':{done:true}});assert.deepEqual(H.snapshot(f).notifications,[]);
});
test('tea countdown and local-date arrival handle elapsed time without mutating tool state',()=>{
 const ctx={...fixture(),tools:{tea:{status:'brewing',endAt:+now+134000},mail:[{status:'sealed',deliverOn:'2026-10-16',read:false}]}};const before=JSON.stringify(ctx.tools);assert.equal(H.snapshot(ctx).today.waiting[0],'Tea brewing · 2:14 left');assert.equal(JSON.stringify(ctx.tools),before);
 ctx.now=new Date(+now+134000);assert.equal(H.snapshot(ctx).today.waiting[0],'Tea is ready');assert.ok(H.snapshot(ctx).notifications.some(n=>n.target==='mailbox'));
});
test('spotlight returns grouped matches from all four real sources and handles literal titles safely',()=>{
 const sources={CAT:{loft:{name:'Cozy loft'},mug:{name:'Tea mug'}},letters:[{id:'l1',title:'Cozy letter'}],scenes:[{id:'s1',title:'Cozy scene'}],ideas:[{id:'i1',text:'A cozy app'}]};
 const groups=H.search(' COZY ',sources);assert.deepEqual(groups.map(g=>g.type),['Furniture','Letters','Scenes','Ideas']);assert.equal(groups[0].items[0].id,'loft');assert.equal(groups[3].items[0].id,'i1');assert.deepEqual(H.search('',sources),[]);assert.deepEqual(H.search('unknown',sources),[]);
 sources.letters.push({id:'l2',title:'<img src=x onerror=alert(1)> café'});assert.equal(H.search('CAFÉ',sources)[0].items[0].title,sources.letters[1].title);
});
test('coziness counts local calendar-week daily completions, resident cats and cared-for current-room plants',()=>{
 const ctx=fixture({'lr.dailyLog':[{date:'2026-10-12'},{date:'2026-10-12'},{date:'2026-10-16'},{date:'2026-10-11'},{date:'2026-10-17'}],'lr.care':{room:{items:{3:{k:'plant',wd:'2026-10-16'},4:{k:'plant',wd:'2026-10-15'},5:{k:'herb',wd:'2026-10-16'}}}}});ctx.roomId='room';ctx.room.items=[{id:1,t:'cat'},{id:2,t:'cat',visitor:true},{id:3,t:'bonsai'},{id:4,t:'pothos'},{id:5,t:'herbs'}];
 const c=H.coziness(ctx);assert.deepEqual([c.moments,c.cats,c.plants,c.score],[2,1,2,5]);assert.ok(c.line.startsWith('The room is humming'));assert.ok(c.line.includes('2 daily moments this week'));assert.equal(H.coziness({...fixture(),plantsToday:3}).plants,3);
});
test('all dayparts, weather and empty-device data have quiet deterministic fallbacks',()=>{
 for(const phase of Object.keys(H.PHASES)){const ctx=fixture();ctx.meta.phase=phase;assert.equal(H.snapshot(ctx).today.phase,H.PHASES[phase]);}
 const c=H.coziness(fixture());assert.equal(c.score,0);assert.ok(c.line.startsWith('A quiet beginning'));assert.equal(H.snapshot({...fixture(),tools:{tea:{status:'done'}}}).today.waiting[0],'The kettle is quiet');
});
test('reduced-motion setting persists separately, defaults to system, and supports an explicit preference',()=>{
 assert.equal(H.reducedMotion(fixture().store,true),true);assert.equal(H.reducedMotion(fixture({[H.MOTION_KEY]:false}).store,true),false);assert.equal(H.reducedMotion(fixture({[H.MOTION_KEY]:true}).store,false),true);
});
test('Home never writes derived state and all Home/private source data stays outside share decor',()=>{
 const ctx=fixture(),before=JSON.stringify(ctx.data);H.snapshot(ctx);assert.equal(JSON.stringify(ctx.data),before);
 const d=W.shareDecor({name:'Room',n:10,home:{text:'PRIVATE_HOME'},reducedMotion:true,letters:{text:'PRIVATE_LETTER'},scenes:[],tools:{ideas:['PRIVATE_IDEA']},items:[{id:1,t:'phone',x:2,z:2,home:'PRIVATE_HOME'}]});assert.ok(!JSON.stringify(d).includes('PRIVATE'));assert.ok(!('home' in d));
});
