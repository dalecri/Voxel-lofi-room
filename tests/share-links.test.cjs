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
test('passing on a friend\'s room never calls it "my room"',()=>{
  const url=L.link('LR1.a');
  assert.match(L.shareText('Den',url),/^Come see my Lofi Room “Den”/);
  assert.match(L.shareText('Den',url,false),/^Come see this Lofi Room “Den”/);
});
test('link previews: the page carries Open Graph tags and the preview picture ships with the build',()=>{
  const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const tag of ['og:title','og:description','og:image','og:url','twitter:card'])assert.match(html,new RegExp(`(property|name)="${tag}"`),tag);
  assert.match(html,/og:image" content="https:\/\/heycristobal\.com\/Voxel-lofi-room\/assets\/og-card\.jpg"/);
  const jpg=fs.readFileSync(path.join(root,'assets','og-card.jpg'));assert.equal(jpg[0],0xff);assert.equal(jpg[1],0xd8);
  // JPEG SOF0 frame: height then width, big-endian.
  const sof=jpg.indexOf(Buffer.from([0xff,0xc0]));assert.ok(sof>0);assert.equal(jpg.readUInt16BE(sof+5),630);assert.equal(jpg.readUInt16BE(sof+7),1200);
  assert.match(fs.readFileSync(path.join(root,'scripts','build-www.mjs'),'utf8'),/og-card\.jpg/);
});
test('Android opens heycristobal.com share links in the app (verified App Links)',()=>{
  const fs=require('node:fs'),path=require('node:path'),xml=fs.readFileSync(path.join(__dirname,'..','android','app','src','main','AndroidManifest.xml'),'utf8');
  assert.match(xml,/<intent-filter android:autoVerify="true">[\s\S]*?android:scheme="https" android:host="heycristobal\.com" android:pathPrefix="\/Voxel-lofi-room"/);
  assert.equal(L.codeFrom('https://heycristobal.com/Voxel-lofi-room/#LR1.abc'),'LR1.abc');
});
