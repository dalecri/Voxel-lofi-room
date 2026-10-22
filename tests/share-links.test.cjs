const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../share-links.js');
test('links carry the code after the #, and any form of it reads back',()=>{
  const code='LR1.abc_DEF-123';const url=L.link(code);
  assert.equal(url,'https://heycristobal.com/Voxel-lofi-room/#'+code);
  for(const t of [code,'#'+code,url,`Come see my room ${url}`,`lofirooms://open?c=${code}`,'  '+code+'  '])assert.equal(L.codeFrom(t),code,t);
  assert.equal(L.codeFrom('https://heycristobal.com/Voxel-lofi-room/#LRG1.note_1'),'LRG1.note_1');
  for(const t of ['','#hello','https://example.com/#LR1.<script>','LR2.x',null])assert.equal(L.codeFrom(t),null);
  assert.throws(()=>L.link('nope'));
});
test('the app link opens the installed app by package and scheme',()=>{
  const i=L.intentLink('LR1.abc');assert.match(i,/^intent:\/\/open\?c=LR1\.abc#Intent;scheme=lofirooms;package=com\.lofirooms\.app;end$/);
  assert.match(L.shareText('Den',L.link('LR1.a')),/Den.*https:\/\/heycristobal\.com\/Voxel-lofi-room\/#LR1\.a/);
});
test('QR codes hold the link until it grows past a scannable size',()=>{
  const qrcode=require('../vendor/qrcode-generator/qrcode.js');
  assert.ok(L.qrMatrix(L.link('LR1.'+'a'.repeat(500)),qrcode).length>20);
  assert.equal(L.qrMatrix('x'.repeat(L.QR_LIMIT+1),qrcode),null);
});
