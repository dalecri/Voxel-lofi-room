const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../backup.js');
function mem(init={}){const m=new Map(Object.entries(init));return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),map:m};}
test('a backup keeps app data and leaves out tokens, caches and other sites',()=>{
  const s=mem({'lr.meta':'{"current":1}','lr.rooms':'[{"id":1}]','lr.googleCalendarToken':'"secret"','lr.roomSnapshots':'{}','lr.captionDesk':'{}','other.thing':'1','lr.someToken':'"x"'});
  const b=B.build(s,Date.UTC(2026,9,22));
  assert.equal(b.format,B.FORMAT);assert.deepEqual(Object.keys(b.data),['lr.meta','lr.rooms']);assert.equal(b.count,2);
  assert.match(B.fileName(Date.UTC(2026,9,22,12)),/^lofi-rooms-backup-2026-10-2\d\.json$/);
});
test('parse rejects strangers and drops bad values',()=>{
  for(const bad of ['nope','{}','{"format":"other","data":{}}','{"format":"lofi-rooms-backup","data":[]}'])assert.throws(()=>B.parse(bad),/isn’t a Lofi Rooms backup/);
  assert.throws(()=>B.parse(JSON.stringify({format:B.FORMAT,v:99,data:{'lr.meta':'{}'}})),/newer version/);
  assert.throws(()=>B.parse(JSON.stringify({format:B.FORMAT,v:1,data:{'x':'1'}})),/empty/);
  const p=B.parse(JSON.stringify({format:B.FORMAT,v:1,createdAt:'2026-10-22T10:00:00Z',data:{'lr.rooms':'[{"id":1},{"id":2}]','lr.bad':'{not json','lr.num':5,'lr.googleCalendarToken':'"t"'}}));
  assert.deepEqual(Object.keys(p.data),['lr.rooms']);assert.equal(p.rooms,2);assert.equal(p.createdAt,Date.parse('2026-10-22T10:00:00Z'));
});
test('restore replaces app data but keeps sign-in tokens and other sites',()=>{
  const s=mem({'lr.meta':'{"old":1}','lr.extra':'1','lr.googleCalendarToken':'"keep"','site.x':'1'});
  const p=B.parse(JSON.stringify(B.build(mem({'lr.meta':'{"new":1}','lr.rooms':'[]'}))));
  B.apply(p,s);assert.equal(s.getItem('lr.meta'),'{"new":1}');assert.equal(s.getItem('lr.rooms'),'[]');assert.equal(s.getItem('lr.extra'),null);
  assert.equal(s.getItem('lr.googleCalendarToken'),'"keep"');assert.equal(s.getItem('site.x'),'1');
});
