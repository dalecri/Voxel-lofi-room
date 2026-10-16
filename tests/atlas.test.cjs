const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../atlas.js'),W=require('../widgets.js'),LR=require('../room.js');A.register(LR);
const radio=[{name:'Quiet jazz',url_resolved:'https://radio.example/jazz',votes:5,codec:'MP3',bitrate:128},{name:'Lofi signal',url_resolved:'https://radio.example/lofi',votes:90,codec:'AAC',bitrate:64},{name:'Bad',url_resolved:'javascript:alert(1)'}];
const art={data:[{id:1,title:'Blue window',artist_title:'A painter',image_id:'abc-123',date_display:'1901'},{id:2,title:'Sunlit room',artist_title:'Another painter',image_id:'def-456',date_display:'1920'}]};
const books={docs:[{key:'/works/OL1W',title:'A book',author_name:['An author'],isbn:['bad','9780140328721']},{title:'No cover',isbn:[]}]};
const kp=[['time_tag','Kp','a_running','station_count'],['2026-10-16 00:00:00','5.00','48','8'],['2026-10-16 03:00:00','7.00','48','8']];
const holidays=[{date:'2026-07-01',name:'Canada Day',localName:'Canada Day'},{date:'2025-07-01',name:'Old year'},{date:'bad',name:'Bad'}];
const cocktail={drinks:[{strDrink:'A small fizz',strCategory:'Cocktail',strInstructions:'Stir gently.',strDrinkThumb:'https://www.thecocktaildb.com/image.jpg',strIngredient1:'Lime',strMeasure1:'1 wedge',strIngredient2:null,strMeasure2:null,strIngredient3:'Soda',strMeasure3:' ',strIngredient4:''}]};
function fixture(on=false,fetch){const values={},calls=[];let time=new Date(2026,9,16,12).getTime(),saveCount=0;const store={get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}},meta={liveExtras:on};const fetcher=async (u,options)=>{calls.push({url:u,options});if(fetch)return fetch(u,options);const body=u.includes('radio-browser')?radio:u.includes('artic.edu')?art:u.includes('openlibrary')?books:u.includes('noaa.gov')?kp:u.includes('nager.at')?holidays:u.includes('catfact')?{fact:'A cached cat fact.'}:cocktail;return {ok:true,json:async()=>structuredClone(body)};};const model=A.create({store,meta,fetcher,now:()=>time,save:()=>saveCount++});return {model,store,values,meta,calls,time:n=>time=n,now:()=>time,saves:()=>saveCount};}
test('seven parsers normalize fixtures, reject unsafe URLs and pair nonempty ingredients with measures',()=>{
 assert.deepEqual(A.radioRows(radio).map(r=>r.name),['Lofi signal','Quiet jazz']);assert.deepEqual(A.stationFor(A.radioRows(radio)[0]),{name:'Lofi signal',url:'https://radio.example/lofi',icon:'📻'});
 assert.equal(A.artRows(art)[0].image,'https://www.artic.edu/iiif/2/abc-123/full/400,/0/default.jpg');assert.equal(A.bookRows(books)[0].isbn,'9780140328721');assert.equal(A.bookRows(books).length,1);assert.equal(A.coverURL('9780140328721'),'https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg');
 assert.equal(A.kpValue([['time_tag','Kp'],['now',true]]),null);assert.equal(A.kpValue(kp),7);assert.equal(A.kpValue([{time_tag:'2026-01-01',kp_index:6}]),6);assert.equal(A.auroraActive(6,'night'),true);assert.equal(A.auroraActive(5,'night'),false);assert.equal(A.auroraActive(7,'day'),false);assert.equal(A.auroraActive(7,'night',false),false);
 assert.deepEqual(A.holidayRows(holidays,2026),[{date:'2026-07-01',name:'Canada Day',localName:'Canada Day'}]);assert.equal(A.factRow({fact:' Soft paws. '}),'Soft paws.');assert.deepEqual(A.drinkRow(cocktail).ingredients,[{ingredient:'Lime',measure:'1 wedge'},{ingredient:'Soda',measure:''}]);
 for(const input of [null,{},[],{data:[null]},{docs:[null]},{drinks:[null]}]){assert.deepEqual(A.radioRows(input),[]);assert.deepEqual(A.artRows(input),[]);assert.deepEqual(A.bookRows(input),[]);assert.equal(A.kpValue(input),null);assert.equal(A.drinkRow(input),null);assert.deepEqual(A.holidayRows(input,2026),[]);}
 assert.equal(A.url('javascript:alert(1)'), '');assert.equal(A.url('https://user:pass@example.com/'),'');
});
test('art of the day is deterministic, all seven sources are reachable and books persist only ISBNs',async()=>{
 const f=fixture();await f.model.refresh();assert.equal(f.calls.length,0);assert.deepEqual(f.model.state.art,A.FALLBACK_ART);
 const d=new Date(2026,9,16);assert.deepEqual(A.artForDay(A.artRows(art),d),A.artForDay(A.artRows(art),d));assert.deepEqual(A.artForDay([],d),A.FALLBACK_ART);
 await f.model.setEnabled(true);assert.equal(f.saves(),1);assert.equal(f.calls.length,3);assert.equal(f.model.state.kp,7);assert.equal(f.model.holidaysFor(2026)[0].date,'2026-07-01');
 await f.model.radio('jazz');const rows=await f.model.books('cats & sunlight');assert.ok(f.calls.some(r=>r.url.includes('q=cats%20%26%20sunlight')));await f.model.fact();await f.model.drink();assert.equal(f.calls.length,7);
 assert.ok(f.model.addBook(rows[0].isbn));assert.ok(f.model.addBook(rows[0].isbn));assert.equal(f.model.addBook('javascript:no'),false);assert.deepEqual(f.values[A.BOOKS_KEY],['9780140328721']);assert.deepEqual(A.create({store:f.store,meta:f.meta}).savedBooks(),['9780140328721']);f.model.removeBook(rows[0].isbn);assert.deepEqual(f.model.savedBooks(),[]);
 assert.ok(f.calls.every(c=>c.options.credentials==='omit'&&c.options.referrerPolicy==='no-referrer'));
});
test('24h art, 30min Kp, 1h radio and yearly holiday caches survive reload and throttle natural triggers',async()=>{
 const f=fixture(true);await f.model.refresh();await f.model.radio('lofi');assert.equal(f.calls.length,4);await Promise.all([f.model.refresh(),f.model.refresh(),f.model.radio('lofi')]);assert.equal(f.calls.length,4);
 f.time(f.now()+31*60000);await f.model.refresh();assert.equal(f.calls.length,5);assert.equal(f.calls.at(-1).url.includes('noaa.gov'),true);
 f.time(f.now()+31*60000);await f.model.radio('lofi');assert.equal(f.calls.length,6);
 let loads=0;const reload=A.create({store:f.store,meta:f.meta,now:f.now,fetcher:async()=>{loads++;return {ok:false};}});await reload.refresh();assert.equal(reload.state.kp,7);assert.equal(loads,1,'only newly stale Kp retries');assert.equal(reload.holidaysFor(2026).length,1);
 f.time(f.now()+A.DAY);await f.model.refresh();assert.equal(f.calls.filter(c=>c.url.includes('artic.edu')).length,2);assert.equal(f.calls.filter(c=>c.url.includes('nager.at')).length,1);
});
test('HTTP, bad JSON, empty rows and exceptions all fail soft; facts and prior cache remain useful',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>{throw Error('bad JSON');}},{ok:true,json:async()=>({})},null]){
  const f=fixture(true,async()=>{if(!response)throw Error('offline');return response;});await f.model.refresh();assert.deepEqual(f.model.state.art,A.FALLBACK_ART);assert.equal(f.model.state.kp,0);assert.deepEqual(f.model.holidaysFor(2026),[]);assert.deepEqual(await f.model.radio('jazz'),[]);assert.deepEqual(await f.model.books('a book'),[]);assert.ok(await f.model.fact());assert.deepEqual(await f.model.drink(),A.FALLBACK_DRINK);
  const count=f.calls.length;await f.model.refresh();assert.equal(f.calls.length,count,'ambient failures wait for the next natural cycle');
 }
 const f=fixture();await f.model.fact();const offline=A.create({store:f.store,meta:f.meta,fetcher:async()=>{throw Error('offline');}});assert.equal(await offline.fact(),'A cached cat fact.');
});
test('Met public-domain fallback shares the art path and disabling ignores late ambient responses',async()=>{
 const f=fixture(true,async u=>({ok:true,json:async()=>u.includes('artic.edu')?{}:u.includes('/search?')?{objectIDs:[12]}:u.includes('/objects/')?{objectID:12,isPublicDomain:true,title:'Met landscape',artistDisplayName:'Painter',objectDate:'1800',primaryImageSmall:'https://images.metmuseum.org/art.jpg'}:[]}));await f.model.refresh();assert.equal(f.model.state.art.source,'The Metropolitan Museum of Art');assert.equal(A.metArt({isPublicDomain:false}),null);
 const releases=[];const g=fixture(true,()=>new Promise(r=>{releases.push(r);}));const task=g.model.refresh();await new Promise(r=>setImmediate(r));g.model.setEnabled(false);for(const release of releases)release({ok:true,json:async()=>holidays});await task;assert.equal(g.meta.liveExtras,false);assert.equal(g.model.state.kp,0);assert.deepEqual(g.model.state.art,A.FALLBACK_ART);
});
test('gallery furniture is ordinary decor; no atlas cache or private ISBNs cross the share boundary',()=>{
 const C=LR.CAT.galleryframe,m=new LR.Model();C.build(m,C.vars[0]);assert.equal(C.tap,'atlas-art');assert.ok(m.parts.main.vox.size);
 const room=new LR.Room();room.add(room.make('galleryframe',{k:0,u:0,e:0}));const payload=room.serialize();payload.atlas={fact:'PRIVATE_FACT'};payload.bookshelf=['PRIVATE_ISBN'];payload.items[0].atlas={art:'PRIVATE_ART'};const encoded=JSON.stringify(W.shareDecor(payload));assert.ok(!encoded.includes('PRIVATE_'));assert.ok(encoded.includes('galleryframe'));
});
