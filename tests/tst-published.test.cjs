const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../tst-published.js');
const mem=()=>{const db=new Map();return {get:(k,d)=>structuredClone(db.has(k)?db.get(k):d),set:(k,v)=>db.set(k,structuredClone(v))};};
test('seeds every library caption once, with valid categories, icons and cats',()=>{
  const posts=T.seedPosts();assert.equal(posts.length,116);assert.equal(new Set(posts.map(p=>p.id)).size,116);
  for(const p of posts){assert.ok(T.CATEGORIES.some(c=>c.id===p.category),p.text);assert.ok(T.ICONS[p.icon],p.text);assert.ok(p.cats.every(c=>T.CATS.some(x=>x.id===c)));}
});
test('publishing a studio clip adds it first, once, with a guessed category and the named cats',()=>{
  let t=1000;const m=T.create({store:mem(),now:()=>t++});const a=m.publish({clip:'c1',text:'Neo and Ramses demanding second breakfast'});
  assert.equal(m.posts[0].id,a.id);assert.equal(a.category,'food');assert.deepEqual(a.cats,['neo','ramses']);assert.equal(a.from,'studio');
  assert.equal(m.publish({clip:'c1',text:'again'}).id,a.id);assert.equal(m.posts.length,117);assert.ok(m.publishedClip('c1'));
  m.remove(a.id);assert.ok(!m.publishedClip('c1'));assert.equal(m.posts.length,116);assert.equal(m.publish({text:'  '}),null);
});
test('edits persist and bad saved data falls back safely',()=>{
  const s=mem(),m=T.create({store:s});m.update('seed-001',{category:'chaos',cats:['cali','nope']});
  const again=T.create({store:s}).get('seed-001');assert.equal(again.category,'chaos');assert.equal(again.icon,'bolt');assert.deepEqual(again.cats,['cali']);
  for(const bad of [null,'x',{posts:'no'},{posts:[null,{id:1}]}]){const b=mem();b.set(T.KEY,bad);const list=T.create({store:b}).posts;assert.ok(Array.isArray(list));}
  const b=mem();b.set(T.KEY,{posts:[{id:'a',text:'Hi',category:'weird',cats:['neo','neo']}]});const p=T.create({store:b}).get('a');assert.equal(p.category,'dreamy');assert.deepEqual(p.cats,['neo']);
});
