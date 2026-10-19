const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../press.js'),W=require('../widgets.js');
const store=()=>{const values={};return {values,get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}};};
const T='2026-10-19',back=n=>P.addDays(T,-n);
// activity rows from [daysAgo, kind, count] triples
const log=(...items)=>{const by={};for(const [ago,kind,n=1] of items){const d=back(ago);(by[d]||(by[d]=[])).push(...Array(n).fill(kind));}return Object.entries(by).map(([date,events])=>({date,events}));};
const L=(...items)=>P.ledger({activity:log(...items)});

test('ledger merges activity, focus sessions without double counting, cat diary kinds and pushup reps',()=>{
 const l=P.ledger({activity:[{date:T,events:['tea','tea','focus','bogus']},{date:'not-a-date',events:['tea']}],focus:[{date:T,completed:true},{date:T,status:'completed'},{date:T,status:'pocketed'}],catLog:[{time:+new Date(2026,9,19,14),kind:'mischief',name:'Diego'},{time:+new Date(2026,9,19,15),kind:'eat'}],reps:{[T]:62,bad:5}});
 assert.deepEqual(l,{tea:{[T]:2},focus:{[T]:2},mischief:{[T]:1},reps:{[T]:62}});
 assert.deepEqual(P.ledger(),{});
});

test('streak detector fires on milestones, on a new longest run, and never on ordinary days',()=>{
 const five=L(...[0,1,2,3,4].map(i=>[i,'tea']));
 const s=P.streaks(five,T);assert.equal(s.length,1);assert.equal(s[0].data.n,5);assert.match(s[0].headline,/Tea, 5 days running/);
 assert.deepEqual(P.streaks(L(...[0,1,2,3].map(i=>[i,'tea'])),T),[]);
 // a streak still counts through yesterday when today has nothing yet
 assert.equal(P.streaks(L(...[1,2,3].map(i=>[i,'focus'])),T)[0].data.n,3);
 // 4 days beats an older 3-day best, so it reports even though 4 is not a milestone
 const best=P.streaks(L(...[0,1,2,3,10,11,12].map(i=>[i,'french'])),T);assert.equal(best[0].data.best,true);assert.equal(best[0].data.previous,3);assert.match(best[0].headline,/longest streak on record/);
 assert.deepEqual(P.streaks(L([0,'tea'],[1,'tea']),T),[]);
});

test('first detector reports a kind seen for the first time today or yesterday, once the house has a week of history',()=>{
 assert.deepEqual(P.firsts(L([0,'letter'],[9,'tea']),T).map(s=>[s.kind,s.data.date]),[['letter',T]]);
 assert.match(P.firsts(L([1,'plant'],[9,'tea']),T)[0].body,/yesterday/);
 assert.deepEqual(P.firsts(L([2,'plant'],[0,'plant'],[9,'tea']),T),[]);
 assert.deepEqual(P.firsts(L([0,'letter'],[3,'tea']),T),[]);
});

test('record detector finds best days, best weeks and pushup bests, but not firsts',()=>{
 const day=P.records(L([0,'tea',3],[5,'tea',2],[9,'tea',1]),T);assert.equal(day[0].data.scope,'day');assert.equal(day[0].headline,'Third tea brew today, a house record');assert.equal(day[0].data.previous,2);
 assert.deepEqual(P.records(L([0,'tea',4]),T),[]);
 // a week of 3 baths against older weeks of at most 2 (one per day, so no day record)
 const week=P.records(L([0,'daily'],[2,'daily'],[4,'daily'],[8,'daily'],[10,'daily'],[15,'daily']),T);assert.equal(week[0].data.scope,'week');assert.match(week[0].headline,/^Third daily moment found this week, a house record/);
 assert.deepEqual(P.records(L([3,'daily'],[2,'daily'],[4,'daily'],[8,'daily'],[10,'daily'],[15,'daily']),T),[]);
 const reps=P.records(P.ledger({reps:{[T]:62,[back(3)]:50}}),T);assert.equal(reps[0].headline,'62 pushups today, a house best');
});

test('drought detector needs an established habit and reports at its threshold, then weekly',()=>{
 const habit=d=>L([d,'tea'],[d+1,'tea'],[d+2,'tea']);
 const s=P.droughts(habit(5),T);assert.equal(s[0].headline,'No tea in 5 days');assert.match(s[0].body,/The kettle is concerned/);
 assert.equal(P.droughts(habit(12),T)[0].data.days,12);
 assert.deepEqual(P.droughts(habit(6),T),[]);assert.deepEqual(P.droughts(habit(4),T),[]);
 assert.deepEqual(P.droughts(L([9,'tea'],[10,'tea']),T),[]);
});

test('week-over-week detector reports doubling and halving with a minimum base',()=>{
 const up=P.weekChange(L([0,'focus',2],[2,'focus',2],[8,'focus'],[9,'focus']),T);assert.equal(up[0].data.direction,'up');assert.match(up[0].headline,/Focus up: 4 this week, 2 the week before/);
 const down=P.weekChange(L([1,'tea'],[8,'tea',2],[9,'tea',2]),T);assert.equal(down[0].data.direction,'down');
 assert.deepEqual(P.weekChange(L([0,'tea'],[8,'tea']),T),[]);
});

test('roundup and busiest day summarise a week for the magazine',()=>{
 const l=L([0,'tea',3],[1,'focus'],[8,'tea',2],[9,'tea']);
 const r=P.roundup(l,T);assert.equal(r[0].kind,'tea');assert.equal(r[0].isBest,false);assert.match(r[0].text,/Tea: 3 this week \(house best 3\)/);
 assert.match(P.busiest(l,back(6),T).text,/^Monday was the week’s busiest day: 3 tea brews/);assert.equal(P.busiest(L([0,'tea']),back(6),T),null);
});

test('detectors are pure: identical inputs give identical stories and inputs are untouched',()=>{
 const l=L([0,'tea',3],[1,'tea'],[2,'tea'],[5,'tea',2]),before=JSON.stringify(l);
 for(const f of [P.streaks,P.firsts,P.records,P.droughts,P.weekChange,P.roundup])assert.deepEqual(f(l,T),f(structuredClone(l),T));
 assert.equal(JSON.stringify(l),before);
});

test('tomorrow box reads events, weather and due tasks, with a pattern-based prediction',()=>{
 const tomorrow=P.addDays(T,1),f=P.forecast({today:T,events:[{date:tomorrow,title:'Vet visit'}],google:[{date:tomorrow,endDate:tomorrow,title:'French class',startAt:new Date(2026,9,20,11).toISOString()}],tasks:[{title:'File report',due:tomorrow},{title:'Later',due:T}],weather:{forecast:[{date:tomorrow,condition:'rain',high:9.4,low:3.6}]},L:L([0,'tea'],[1,'tea'])});
 assert.deepEqual(f.events,[{title:'French class',time:'11am'},{title:'Vet visit',time:''}]);assert.deepEqual(f.tasks,['File report']);assert.equal(f.weather,'Rain on the way, 4° to 9°');
 assert.equal(f.prediction,'French class at 11am, rain on the way. Tea streak on the line: day 3.');
 const habit=P.forecast({today:T,L:L([6,'french'],[13,'french'],[20,'french'])});assert.equal(habit.prediction,'Tuesdays usually bring French sessions (3 of the last 4).');
 assert.match(P.forecast({today:T}).prediction,/blank page/);
});

test('saga state machine: seed, advance, stay, reset when cold, reset when resolved, idempotent per week',()=>{
 let s=P.seedSagas().find(x=>x.cat==='Neo');assert.equal(s.saga,'dinner');assert.equal(s.week,1);
 let r=P.advanceSaga(s,0,'2026-W43');assert.equal(r.outcome,'seed');assert.equal(r.saga.week,1);s=r.saga;
 assert.equal(P.advanceSaga(s,5,'2026-W43').outcome,'same');
 r=P.advanceSaga(s,4,'2026-W44');assert.equal(r.outcome,'advance');assert.deepEqual([r.saga.week,r.saga.chapter,r.saga.hits],[2,1,4]);s=r.saga;
 r=P.advanceSaga(s,0,'2026-W45');assert.equal(r.outcome,'stay');assert.deepEqual([r.saga.week,r.saga.chapter,r.saga.quiet],[3,1,1]);
 assert.match(P.column(r.saga).body,/Week 3 of the campaign\. No new developments\. Neo is understood to be regrouping\. Last week the campaign moved forward\./);
 r=P.advanceSaga(P.advanceSaga(r.saga,0,'2026-W46').saga,0,'2026-W47');assert.equal(r.outcome,'reset');assert.deepEqual([r.saga.season,r.saga.week,r.saga.chapter,r.saga.quiet,r.saga.reason],[2,1,0,0,'cold']);
 assert.match(P.column(r.saga).body,/went cold after three quiet weeks/);
 let done={...P.seedSagas()[0],lastWeek:'2026-W50',chapter:4,week:7};r=P.advanceSaga(done,2,'2026-W51');assert.equal(r.outcome,'reset');assert.equal(r.saga.reason,'resolved');assert.equal(r.saga.season,2);assert.match(P.column(r.saga).body,/concludes after 8 weeks/);
 assert.ok(r.saga.log.length<=6);
});

test('saga evidence counts the cat’s own diary lines in the window plus house events',()=>{
 const catLog=[{name:'Neo',kind:'eat',time:+new Date(2026,9,14,18)},{name:'neo',kind:'eat',time:+new Date(2026,9,15,18)},{name:'Cali',kind:'eat',time:+new Date(2026,9,15,18)},{name:'Neo',kind:'eat',time:+new Date(2026,9,1,18)},{name:'Ramses',kind:'nap',time:+new Date(2026,9,16,23)}];
 const l=P.ledger({activity:[{date:'2026-10-13',events:['cat','cat']}]});
 assert.equal(P.sagaEvidence('dinner','Neo',{catLog,L:l},'2026-10-12','2026-10-18'),4);
 assert.equal(P.sagaEvidence('fridge','Ramses',{catLog},'2026-10-12','2026-10-18'),1);
 assert.equal(P.sagaEvidence('gravity','Diego',{catLog},'2026-10-12','2026-10-18'),0);
});

test('clap ranking boosts clapped types and four ignored editions shrink a section',()=>{
 const stories=[{id:'streak:tea',type:'streak',score:60},{id:'drought:plant',type:'drought',score:55}];
 assert.equal(P.rank(stories,{})[0].type,'streak');
 let prefs={};for(let i=0;i<3;i++)prefs=P.clap(prefs,'news','drought');
 assert.equal(P.rank(stories,prefs)[0].type,'drought');assert.equal(prefs.claps.drought,3);
 prefs={};for(const day of ['d1','d2','d3','d4','d5'])prefs=P.settle(prefs,'news',day,['streak','forecast']);
 assert.equal(prefs.ignored.streak,4);assert.equal(P.shrunk(prefs,'streak'),true);assert.equal(P.rank(stories,prefs)[1].shrunk,true);
 // clapping in the current edition resets the count and stops the next settle counting it
 prefs=P.clap(prefs,'news','streak');assert.equal(prefs.ignored.streak,0);prefs=P.settle(prefs,'news','d6',['streak']);assert.equal(prefs.ignored.streak,0);assert.equal(prefs.ignored.forecast,5);
 // re-rendering the same edition never counts as ignoring it
 const same=P.settle(prefs,'news','d6',['streak','record']);assert.deepEqual(same.ignored,prefs.ignored);assert.deepEqual(same.last.news.types,['record','streak']);
});

test('slim-edition rule: only pattern stories or diary news earn a full front page',()=>{
 assert.equal(P.isSlim([]),true);assert.equal(P.isSlim([{type:'forecast'}]),true);
 for(const type of ['streak','first','record','drought','diary'])assert.equal(P.isSlim([{type}]),false);
});

test('the two papers own disjoint story types',()=>{
 const news=new Set(P.ALLOCATION.news);assert.ok(P.ALLOCATION.drift.every(t=>!news.has(t)));
 for(const t of [...P.ALLOCATION.news,...P.ALLOCATION.drift])assert.ok(P.TYPE_LABEL[t],t);
});

test('village gossip compares room sizes against the last issue',()=>{
 const first=P.gossip([{id:1,name:'Study',n:20},{id:2,name:'Attic',n:4}],{});assert.match(first.lines[0],/Study remains the busiest address/);assert.deepEqual(first.snapshot,{1:20,2:4});
 const next=P.gossip([{id:1,name:'Study',n:26},{id:2,name:'Attic',n:4},{id:3,name:'Den',n:1}],first.snapshot);assert.deepEqual(next.lines,['Study grew by 6 pieces since the last issue. The neighbours have noticed.','A new address on the street: Den.']);
});

test('press model: seeded four-cat sagas, news edition with lead, slim day and private storage',()=>{
 const s=store();let now=new Date(2026,9,19,9);const press=P.create({store:s,now:()=>now});
 assert.deepEqual(press.state.sagas.map(x=>[x.cat,x.week]),[['Cali',1],['Neo',1],['Diego',1],['Ramses',1]]);
 const quiet=press.news({});assert.equal(quiet.slim,true);assert.equal(quiet.lead,null);assert.ok(quiet.forecast.prediction);
 const busy=press.news({activity:log([0,'tea',3],[5,'tea',2],[9,'tea']),tally:{date:T,count:30},diary:{day:4,lead:{title:'Diego: Napped'},headline:'DIEGO: NAPPED',dek:'A nap.',remaining:[{title:'Luna',text:'Ate.'}],sections:['The cats’ version'],reaction:'Hm.'}});
 assert.equal(busy.slim,false);assert.equal(busy.lead.type,'record');assert.equal(busy.stories.find(x=>x.type==='diary').headline,'DIEGO: NAPPED');assert.deepEqual(busy.diary,[{title:'Luna',text:'Ate.'}]);assert.equal(busy.day,4);
 assert.equal(press.state.reps[T],30);
 const diaryOnly=press.news({diary:{day:1,lead:{title:'x'},headline:'DIEGO: INSPECTED DINNER',dek:'d',remaining:[],sections:[]}});assert.equal(diaryOnly.lead.headline,'DIEGO: INSPECTED DINNER');
 assert.equal(press.clap('news','record'),1);assert.equal(press.clapped('news','record'),true);
 assert.deepEqual(Object.keys(s.values),['lr.press']);
 // a magazine issue advances sagas once per issue week and writes room gossip
 const issue={week:'2026-W43',from:'2026-10-12',through:'2026-10-18'};
 const sections=press.magazine(issue,{catLog:[{name:'Neo',kind:'eat',time:+new Date(2026,9,14,18)}],rooms:[{id:1,name:'PRIVATE_ROOM',n:3}]});
 assert.equal(sections.filter(x=>x.type==='saga').length,4);assert.match(sections.find(x=>x.cat==='Neo').body,/Week 1 of The Dinner-Time Campaign/);
 const next=press.magazine({week:'2026-W44',from:'2026-10-19',through:'2026-10-25'},{catLog:[{name:'Neo',kind:'eat',time:+new Date(2026,9,20,18)}]});
 assert.match(next.find(x=>x.cat==='Neo').body,/Week 2 of the campaign/);assert.match(next.find(x=>x.cat==='Cali').body,/Week 2 of the review season\. No new developments/);
 assert.ok(sections.every(x=>P.ALLOCATION.drift.includes(x.type)));
 // nothing from the press can reach a shared room code
 const decor={v:1,name:'Room',n:10,wall:{style:'paint'},floor:{style:'oak'},press:s.values['lr.press'],items:[]};assert.ok(!JSON.stringify(W.shareDecor(decor)).includes('Dinner'));assert.ok(!('press' in W.shareDecor(decor)));
});
