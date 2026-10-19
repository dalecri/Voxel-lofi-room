const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../digest.js'),W=require('../widgets.js'),LR=require('../room.js');
const store=()=>{const values={};return {values,get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>values[k]=structuredClone(v)};};
test('ISO weeks use local calendar dates and handle year boundaries and the previous full week',()=>{
 for(const [date,week] of [[new Date(2021,0,1),'2020-W53'],[new Date(2021,0,4),'2021-W01'],[new Date(2026,9,18),'2026-W42'],[new Date(2026,9,19),'2026-W43']])assert.equal(D.isoWeek(date),week);
 assert.deepEqual(D.period(new Date(2026,9,19)),{from:'2026-10-12',through:'2026-10-18'});assert.deepEqual(D.period(new Date(2026,2,9)),{from:'2026-03-02',through:'2026-03-08'});
});
test('fixed local sources produce deterministic warm sections, real sightings, scenes, guests, streaks and memories',()=>{
 const now=new Date(2026,9,19,9),sources={activity:[{date:'2026-10-12',events:['focus','tea','tea','letter','pushups']},{date:'2026-10-18',events:['focus','idea']},{date:'2026-10-19',events:['tea']},{date:'2026-10-11',events:['letter']}],ideas:[{createdAt:+new Date(2026,9,13)},{createdAt:+new Date(2026,9,14)}],scenes:[{id:'recent',title:'PRIVATE_KYOTO',createdAt:+new Date(2026,9,15)},{id:'old',title:'Last year’s nook',createdAt:+new Date(2025,9,19)}],guestbook:[{d:'2026-10-16',n:'PRIVATE_FRIEND',t:'A good window.'}],streak:{n:6,last:'2026-10-18'},companionLog:[{time:+new Date(2026,9,14,15),name:'Diego',activity:'read'}],events:[{date:'2026-10-21',title:'Pottery afternoon'}]};
 const issue=D.issue(now,sources);assert.deepEqual(issue,D.issue(now,structuredClone(sources)));const section=id=>issue.sections.find(s=>s.id===id);assert.match(section('week').body,/2 focus pauses/);assert.match(section('week').body,/2 tea brews/);assert.match(section('week').body,/1 letter/);assert.match(section('week').body,/2 ideas kept/);assert.match(section('week').body,/1 pushup milestone/);assert.equal(section('scenes').sceneId,'recent');assert.match(section('visitors').body,/PRIVATE_FRIEND/);assert.equal(section('streak'),undefined);assert.match(section('gossip').body,/Diego was spotted supervising the bookshelf at 3pm/);assert.match(section('ahead').body,/Pottery afternoon/);assert.equal(section('memory').sceneId,'old');
});
test('empty or missing optional sources are gentle and do not invent companion events',()=>{
 for(const source of [{},{activity:null,scenes:{},ideas:[],catLog:null}]){const issue=D.issue(new Date(2026,9,19),source);assert.deepEqual(issue.sections.map(s=>s.id),['week','gossip','closing']);assert.match(issue.sections[0].body,/nothing to catch up on/);assert.match(issue.sections[1].body,/supplied no statement/);assert.ok(!JSON.stringify(issue).includes('undefined'));}
 const i=D.issue(new Date(2026,9,19),{catLog:[{time:+new Date(2026,9,15,14),name:'Miso',kind:'nap'}]});assert.match(i.sections.find(s=>s.id==='gossip').body,/Miso was spotted testing the structural limits of a nap at 2pm/);
});
test('paper art builds but never registers as decor; digest content cannot join room shares',()=>{
 const m=new LR.Model();D.PAPER.build(m);assert.ok(Object.values(m.parts).some(p=>p.vox.size));assert.equal(LR.CAT['daily-drift-paper'],undefined);const issue=D.issue(new Date(2026,9,19),{guestbook:[{d:'2026-10-16',n:'PRIVATE_DIGEST_SECRET'}]});const decor={...new LR.Room().serialize(),digest:{lastIssueWeek:issue.week,issues:[issue]},items:[]};assert.ok(!JSON.stringify(W.shareDecor(decor)).includes('PRIVATE_DIGEST_SECRET'));assert.ok(!('digest' in W.shareDecor(decor)));
});
test('one immutable brief per local day, persisted read state and no backfill for missed days',()=>{
 const s=store();let now=new Date(2026,9,19,7),calls=0;const src={activity:[]};const m=D.create({store:s,now:()=>now,sources:()=>{calls++;return src;},brief:()=>({slim:false,sections:[{id:'today',type:'forecast',title:'Today in the house',body:'x'}]})});
 const first=m.ensure();assert.equal(first.date,'2026-10-19');assert.equal(first.brief,1);assert.equal(first.no,1);assert.equal(first.sunday,false);assert.equal(first.read,false);
 now=new Date(2026,9,19,22);assert.deepEqual(m.ensure(),first);assert.equal(calls,1);m.open();assert.equal(m.latest.read,true);
 now=new Date(2026,9,22,8);const later=m.ensure();assert.equal(later.date,'2026-10-22');assert.equal(later.no,2);assert.equal(m.issues.length,2);assert.equal(calls,2);
 now=new Date(2026,9,20,8);m.ensure();assert.equal(m.issues.length,2);assert.deepEqual(Object.keys(s.values),['lr.digest']);
 const saved=m.issues;saved[0].sections[0].body='changed';assert.notEqual(m.latest.sections[0].body,'changed');
 assert.equal(m.open('2026-10-19').date,'2026-10-19');
});
test('Sunday brief adds the weekly pages after the daily front, closing last; weekdays never do',()=>{
 const s=store();let now=new Date(2026,9,25,7);let mags=0;const m=D.create({store:s,now:()=>now,sources:()=>({activity:[{date:'2026-10-21',events:['tea']}]}),brief:()=>({slim:true,sections:[{id:'today',type:'forecast',title:'Today',body:'x'}]}),magazine:issue=>{mags++;return [{id:'saga-neo',type:'saga',title:'Neo',body:'Week 1 '+issue.week}];},arrange:v=>v});
 const sun=m.ensure();assert.equal(sun.sunday,true);assert.equal(sun.slim,false);assert.equal(sun.week,'2026-W44');assert.deepEqual([sun.from,sun.through],['2026-10-19','2026-10-25']);
 assert.equal(sun.sections[0].type,'forecast');assert.ok(sun.sections.some(x=>x.id==='saga-neo'));assert.equal(sun.sections.at(-1).id,'closing');assert.match(sun.sections.find(x=>x.id==='week').body,/1 tea brew/);
 now=new Date(2026,9,26,7);const mon=m.ensure();assert.equal(mon.sunday,false);assert.equal(mon.slim,true);assert.deepEqual(mon.sections.map(x=>x.type),['forecast']);assert.equal(mags,1);
});
test('older weekly issues stay readable in the archive and never block today’s brief',()=>{
 const s=store();s.set('lr.digest',{lastIssueWeek:'2026-W43',issues:[{week:'2026-W43',date:'2026-10-19',from:'2026-10-12',through:'2026-10-18',sections:[{id:'week',title:'Old',body:'old'}],read:true}]});
 const m=D.create({store:s,now:()=>new Date(2026,9,19,9)});const today=m.ensure();assert.equal(today.brief,1);assert.equal(m.issues.length,2);assert.equal(m.open('2026-W43').sections[0].title,'Old');
});
