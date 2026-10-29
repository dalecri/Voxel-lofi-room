const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../lane.js');
const catalog=[...'abcdefghij'].map(id=>({id,name:'Item '+id,price:10})).concat([{id:'x1',exclusive:true,price:50},{id:'x2',exclusive:true,price:50}]);
const addDays=(d,n)=>{const t=new Date(d+'T12:00');t.setDate(t.getDate()+n);return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;};
test('the shelf: three unowned finds a day, the same all day, and every skipped item comes back',()=>{
  const a=L.shelf({catalog,date:'2026-10-28'}),b=L.shelf({catalog,date:'2026-10-28'});
  assert.deepEqual(a,b);assert.equal(a.items.length,3);assert.equal(new Set(a.items).size,3);assert.ok(a.items.every(id=>!id.startsWith('x')),'specials never sit on the regular shelf');
  const seen=new Set();for(let k=0;k<L.cycleDays({catalog});k++)L.shelf({catalog,date:addDays('2026-10-28',k)}).items.forEach(i=>seen.add(i));
  assert.equal(seen.size,10,'within one cycle every regular item is offered');
  const owned=new Set(['a','b','c','d','e','f','g','h']);const few=L.shelf({catalog,owns:id=>owned.has(id),date:'2026-10-28'});
  assert.ok(few.items.every(id=>!owned.has(id)));assert.ok(few.items.length<=2);
  assert.deepEqual(L.shelf({catalog,owns:()=>true,date:'2026-10-28'}),{items:[],special:null});
});
test('Sundays add one rare special; other days never do',()=>{
  assert.equal(L.shelf({catalog,date:'2026-10-25'}).special.startsWith('x'),true);
  assert.equal(L.shelf({catalog,date:'2026-10-26'}).special,null);
  assert.equal(L.shelf({catalog,owns:id=>id.startsWith('x'),date:'2026-10-25'}).special,null);
});
test('the away note is gentle and capped: nothing under two days, no growing pile',()=>{
  assert.equal(L.away({lastVisit:'2026-10-28',today:'2026-10-29'}),null);
  assert.match(L.away({lastVisit:'2026-10-25',today:'2026-10-29',unreadPapers:1}),/away 4 days.*One paper is waiting/);
  assert.match(L.away({lastVisit:'2026-09-01',today:'2026-10-29',unreadPapers:40}),/a little while.*A few papers.*no rush/);
  assert.equal(L.away({lastVisit:'',today:'2026-10-29'}),null);
});
test('letters are templated: a welcome on day one, a note each Sunday after',()=>{
  const first=L.letters({firstVisit:'2026-10-29',today:'2026-10-29'});assert.deepEqual(first.map(l=>l.id),['welcome']);
  const later=L.letters({firstVisit:'2026-10-20',today:'2026-10-29',specialName:'Galaxy aquarium'});
  assert.deepEqual(later.map(l=>l.id),['sunday-2026-10-25','welcome']);assert.match(later[0].body,/Galaxy aquarium/);
});
test('the notice board lists tomorrow and the week from the calendar, skipping empty days',()=>{
  const rows=L.notices({today:'2026-10-29',events:[{date:'2026-10-30',title:'Vet'},{date:'2026-11-02',title:'Dentist'},{date:'2026-11-09',title:'Too far'}],holidays:[{date:'2026-10-31',name:'Halloween'}],seasonal:d=>d==='2026-11-01'?['Cozy season begins']:[]});
  assert.deepEqual(rows.map(r=>r.label.slice(0,8)),['Tomorrow',rows[1].label.slice(0,8),rows[2].label.slice(0,8),rows[3].label.slice(0,8)]);
  assert.equal(rows.length,4);assert.deepEqual(rows[0].items,[{kind:'event',title:'Vet'}]);assert.equal(rows[1].items[0].kind,'holiday');
  assert.ok(!rows.some(r=>r.items.some(i=>i.title==='Too far')));
  assert.match(L.skyNote('2026-10-29'),/53 days until the December solstice/);assert.equal(L.skyNote('2026-12-21'),'Today is the December solstice.');
});
test('the lane model records visits once a day and keeps read marks',()=>{
  const data={};const store={get:(k,d)=>k in data?JSON.parse(data[k]):d,set:(k,v)=>{data[k]=JSON.stringify(v);}};let day='2026-10-20';
  const m=L.create({store,today:()=>day});assert.equal(m.visit(),null);assert.equal(m.firstVisit,'2026-10-20');
  day='2026-10-21';assert.equal(m.visit(),null);day='2026-10-25';assert.match(m.visit(2),/away 4 days/);assert.equal(m.visit(2),null,'only once per return');
  assert.equal(m.isRead('welcome'),false);m.markRead('welcome');m.markRead('welcome');assert.equal(m.isRead('welcome'),true);assert.equal(JSON.parse(data['lr.lane']).read.length,1);
});
test('residents: the save’s own pets, one seeded place a day, everyone home at night',()=>{
  const pets=['Biscuit','Pepper','Mochi','Toast','Bean'].map((name,i)=>({key:'r:'+i,name,coat:0x111111*i}));
  const day=L.residents({pets,date:'2026-10-29',phase:'afternoon'});
  assert.deepEqual(day,L.residents({pets,date:'2026-10-29',phase:'afternoon'}),'same day, same routine');
  assert.equal(day.length,5);assert.ok(day.every(r=>['house','shop','mail','notice'].includes(r.place)&&L.DOING[r.place].includes(r.doing)));
  const week=new Set();for(let d=20;d<=29;d++)L.residents({pets,date:`2026-10-${d}`,phase:'morning'}).forEach(r=>week.add(r.place));
  assert.equal(week.size,4,'over a week the pets visit every place');
  assert.ok(L.residents({pets,date:'2026-10-29',phase:'night'}).every(r=>r.place==='house'&&r.doing==='asleep at home'));
  assert.equal(L.residents({pets:[],date:'2026-10-29'}).length,0);
  assert.equal(L.sayAround([{name:'Neo',doing:'asleep at home'},{name:'Cali',doing:'asleep at home'},{name:'Bean',doing:'sorting the post'}]),'Neo and Cali are asleep at home. Bean is sorting the post.');
});
test('seasons: hemisphere from latitude or time zone, a note a month, dressing from date and weather',()=>{
  assert.equal(L.hemisphere({timeZone:'America/Toronto'}),'north');assert.equal(L.hemisphere({timeZone:'Australia/Sydney'}),'south');
  assert.equal(L.hemisphere({timeZone:'America/Sao_Paulo'}),'south');assert.equal(L.hemisphere({latitude:-41,timeZone:'Europe/Paris'}),'south');
  assert.notEqual(L.seasonNote('2026-07-10','north'),L.seasonNote('2026-07-10','south'));assert.equal(L.seasonNote('2026-07-10','south'),L.seasonNote('2026-01-10','north'));
  const seasons=[{group:'halloween',from:[9,1],to:[10,2]},{group:'holiday',from:[11,1],to:[0,7]}];
  assert.deepEqual(L.dressing({date:'2026-10-31',seasons,weather:'storm'}),{season:'halloween',weather:'rain'});
  assert.deepEqual(L.dressing({date:'2027-01-05',seasons,weather:'snow'}),{season:'holiday',weather:'snow'});
  assert.deepEqual(L.dressing({date:'2026-06-01',seasons,weather:'clear'}),{season:'',weather:''});
});
test('birthdays already on the calendar are spotted 30 days ahead and marked in the week',()=>{
  const events=[{date:'2026-11-05',title:"Mom's Birthday"},{date:'2026-10-30',title:'Anniversary dinner'},{date:'2026-11-01',title:'Vet'},{date:'2027-02-01',title:'bday later'}];
  assert.deepEqual(L.birthdays({events,today:'2026-10-29'}).map(e=>[e.title,e.inDays]),[['Anniversary dinner',1],["Mom's Birthday",7]]);
  const rows=L.notices({today:'2026-10-29',events});assert.equal(rows[0].items[0].kind,'birthday');assert.match(rows[0].items[0].title,/^🎂 /);
});
