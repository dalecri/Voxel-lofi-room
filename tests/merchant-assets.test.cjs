const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const L = require('../room.js');
require('../furniture.js');
const extras = require('../merchant-assets.js');
const shop = require('../shop.js');

test('24 distinct merchant models keep functional bases free and have correct picker metadata', () => {
  const bases = ['sofa','armchair','chair','minifridge','counter','console'];
  const before = bases.map(id => L.CAT[id]);
  extras.register(L);
  assert.equal(extras.catalog.length, 24);
  assert.equal(shop.catalog.length, 33);
  const hashes = new Set();
  for (const item of extras.catalog) {
    const C = L.CAT[item.piece], m = new L.Model(); C.build(m, C.vars[0], { on: true });
    assert.equal(C.name, item.name); assert.equal(C.shop, item.id); assert.equal(C.group, 'market');
    assert.ok(C.size.every(n => Number.isInteger(n) && n > 0));
    const parts = Object.entries(m.parts).map(([name,p]) => [name,[...p.vox.entries()].sort((a,b)=>a[0]-b[0])]);
    assert.ok(parts.some(([,v])=>v.length>0));
    hashes.add(createHash('sha256').update(JSON.stringify(parts)).digest('hex'));
    for (const [,p] of Object.entries(m.parts)) for (const key of p.vox.keys()) {
      const [x,y,z]=L.Model.decode(key); assert.ok(y>=0 && y<32 && x>=-1 && x<24 && z>=0 && z<16,item.id);
    }
  }
  assert.equal(hashes.size, 24);
  bases.forEach((id,k)=>{assert.equal(L.CAT[id],before[k]); assert.equal(L.CAT[id].shop,undefined);});
  assert.equal(L.CAT.shopsageicebox.top,24);
  assert.ok(L.CAT.shopsageicebox.build);
});

test('new collectibles unlock once, deduct exact prices and remain owned after reload', () => {
  const values = new Map([['lr.fireflies',10000]]);
  const store={get:(k,d)=>values.has(k)?values.get(k):d,set:(k,v)=>values.set(k,JSON.parse(JSON.stringify(v)))};
  let w=shop.create({store,today:()=> '2026-10-15'}), spent=0;
  for(const item of extras.catalog) {
    const C=L.CAT[item.piece]; assert.equal(w.available(C),false);
    assert.equal(w.buy(item.id),true); assert.equal(w.buy(item.id),false);spent+=item.price;
    w=shop.create({store,today:()=> '2026-10-15'});
    assert.equal(w.available(C),true); assert.equal(w.balance,10000-spent);
  }
  assert.equal(values.get('lr.shopOwned').length,24);
});
