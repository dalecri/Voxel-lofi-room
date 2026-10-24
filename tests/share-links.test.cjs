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
test('short links: #r/<id> and lofirooms://open?r=<id> read back; the app intent carries r=',()=>{
  assert.equal(L.shortLink('ab12cd34'),'https://heycristobal.com/Voxel-lofi-room/#r/ab12cd34');
  for(const t of ['https://heycristobal.com/Voxel-lofi-room/#r/ab12cd34','#r/AB12CD34','lofirooms://open?r=ab12cd34',`Come see my room ${L.shortLink('ab12cd34')}`])assert.equal(L.shortFrom(t),'ab12cd34',t);
  for(const t of ['','#r/ab12','#r/ab12cd34x','https://heycristobal.com/Voxel-lofi-room/#LR1.abc',null])assert.equal(L.shortFrom(t),null,String(t));
  assert.equal(L.codeFrom(L.shortLink('ab12cd34')),null);assert.throws(()=>L.shortLink('nope'));
  assert.match(L.intentLink('ab12cd34'),/^intent:\/\/open\?r=ab12cd34#Intent;scheme=lofirooms;package=com\.lofirooms\.app;end$/);
});
test('shorten and expand talk to the two Supabase functions and check what comes back',async()=>{
  const calls=[],store=new Map(),fetcher=async(url,opts)=>{calls.push({url,opts});const body=JSON.parse(opts.body),name=url.split('/').pop();
    if(name==='shorten_room_link'){const id='ab12cd34';store.set(id,body.p_code);return {ok:true,json:async()=>id};}
    if(name==='room_link')return {ok:true,json:async()=>store.get(body.p_id)??null};return {ok:false,status:404};};
  assert.equal(await L.shorten('LR1.abc',fetcher),'ab12cd34');
  assert.equal(calls[0].url,L.SHORTENER.url+'shorten_room_link');assert.equal(calls[0].opts.method,'POST');assert.equal(calls[0].opts.headers.apikey,L.SHORTENER.key);
  assert.equal(await L.expand('ab12cd34',fetcher),'LR1.abc');assert.equal(await L.expand('zzzzzzzz',fetcher),null);
  await assert.rejects(()=>L.shorten('not a code',fetcher));await assert.rejects(()=>L.expand('bad',fetcher));
  await assert.rejects(()=>L.shorten('LR1.abc',async()=>({ok:false,status:503})),/resting/);
  await assert.rejects(()=>L.expand('ab12cd34',async()=>({ok:true,json:async()=>'<script>'})),/Unexpected/);
  await assert.rejects(()=>L.shorten('LR1.abc',async()=>({ok:true,json:async()=>'../x'})),/Unexpected/);
});
test('the card says whose room it is, in feed-sized type, with one call to action',()=>{
  const qrcode=require('../vendor/qrcode-generator/qrcode.js');
  const draw=opts=>{const texts=[],fonts=[];let font='';const g=new Proxy({},{get:(t,k)=>k==='measureText'?s=>({width:String(s).length*(parseInt(font.split(' ')[1])||10)*.5}):k==='fillText'?(s,x,y)=>{texts.push(String(s));fonts.push(font);}:k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:(t,k,v)=>{if(k==='font')font=v;return true;}});
    L.drawCard({getContext:()=>g},{title:'Den',url:L.shortLink('ab12cd34'),qrcode,...opts});return {texts,fonts};};
  let {texts,fonts}=draw({by:'Cris'});
  assert.ok(texts.includes('COME VISIT CRIS’S LOFI ROOM'),texts);assert.ok(texts.includes('Scan to step inside'));
  assert.ok(!texts.some(t=>/tap the link in my message|tap the link on my story/.test(t)),'one call to action, not two');
  assert.ok(parseInt(fonts[texts.indexOf('Scan to step inside')].split(' ')[1])>=40,'big enough to read in a feed');
  assert.ok(draw({}).texts.includes('COME VISIT MY LOFI ROOM'));
  assert.ok(draw({by:'Cris',mine:false}).texts.includes('COME SEE THIS LOFI ROOM'),'passing a friend’s room on never names you');
});
