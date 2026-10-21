// Free live extras. Ambient sources require meta.liveExtras; all other requests follow a tap.
// Cache and ISBNs are device-private, never properties of room items or share payloads.
(function(root){
  const KEY='lr.atlas',BOOKS_KEY='lr.bookshelf',HOUR=3600000,DAY=24*HOUR,TAGS=['lofi','jazz','ambient','chillout'];
  const BOOKSHELVES=['bookshelf','libcase','libcasewide','libcaselow'];
  const FALLBACK_ART={title:'A little landscape',artist:'Made here, in your room',date:'',image:'',source:'Offline gallery'};
  const FALLBACK_FACTS=['Cats have whiskers on their front legs as well as their faces.','Cats use their tails to help them balance.','A cat’s nose has its own pattern of ridges.'];
  const FALLBACK_DRINK={name:'Quiet citrus spritz',category:'Offline recipe',image:'',ingredients:[{ingredient:'Sparkling water',measure:'150 ml'},{ingredient:'Orange juice',measure:'50 ml'}],instructions:'Pour over ice, stir gently, and settle in.'};
  const text=(v,n=300)=>typeof v==='string'?v.trim().slice(0,n):'';
  const list=v=>Array.isArray(v)?v:[];
  function url(v){try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch(e){return '';}}
  const imageURL=v=>{const u=url(v);return u.startsWith('https:')?u:'';};
  function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function seed(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
  function radioRows(body){return list(body).map(r=>({name:text(r?.name,80),url:url(r?.url_resolved || r?.url),codec:text(r?.codec,20),bitrate:Math.max(0,Number(r?.bitrate)||0),votes:Math.max(0,Number(r?.votes)||0)})).filter(r=>r.name&&r.url).sort((a,b)=>b.votes-a.votes).slice(0,24);}
  const stationFor=row=>({name:row.name,url:row.url,icon:'📻'});
  function artRows(body){return list(body?.data).filter(r=>Number.isInteger(r?.id)&&text(r.title)&&/^[\w-]+$/.test(r.image_id || '')).map(r=>({id:r.id,title:text(r.title),artist:text(r.artist_title)||'Artist unknown',date:text(r.date_display,100),image:`https://www.artic.edu/iiif/2/${r.image_id}/full/400,/0/default.jpg`,source:'Art Institute of Chicago'}));}
  function artForDay(rows,date){return rows.length?rows[seed(dateKey(date))%rows.length]:{...FALLBACK_ART};}
  // The Met is the fallback: search landscapes, then fetch one deterministic public-domain object.
  function metArt(body){if(!body?.isPublicDomain || !imageURL(body.primaryImageSmall || body.primaryImage))return null;return {id:body.objectID,title:text(body.title)||'Untitled',artist:text(body.artistDisplayName)||'Artist unknown',date:text(body.objectDate,100),image:imageURL(body.primaryImageSmall || body.primaryImage),source:'The Metropolitan Museum of Art'};}
  function isbn(value){const s=text(value,30).replace(/[ -]/g,'').toUpperCase();return /^(\d{13}|\d{9}[\dX])$/.test(s)?s:'';}
  const coverURL=id=>isbn(id)?`https://covers.openlibrary.org/b/isbn/${isbn(id)}-M.jpg`:'';
  function bookRows(body){return list(body?.docs).map(r=>({key:text(r?.key),title:text(r?.title),author:list(r?.author_name).map(s=>text(s,100)).filter(Boolean).join(', '),isbn:list(r?.isbn).map(isbn).find(Boolean)||''})).filter(r=>r.title&&r.isbn).slice(0,6);}
  function kpValue(body){
    let rows=list(body),values=[];
    if(Array.isArray(rows[0])){const header=rows[0].map(s=>String(s).toLowerCase().replace(/_/g,'')),col=header.findIndex(s=>s==='kp'||s==='kpindex');if(col<0)return null;values=rows.slice(1).map(r=>({time:String(r?.[0] || ''),kp:r?.[col]}));}
    else values=rows.map(r=>({time:String(r?.time_tag || ''),kp:r?.kp_index}));
    const latest=values.filter(r=>(typeof r.kp==='number'||typeof r.kp==='string'&&r.kp.trim()!=='')&&Number.isFinite(Number(r.kp))&&Number(r.kp)>=0&&Number(r.kp)<=9).sort((a,b)=>a.time.localeCompare(b.time)).at(-1);
    return latest?Number(latest.kp):null;
  }
  const auroraActive=(kp,phase,on=true)=>on&&phase==='night'&&Number.isFinite(kp)&&kp>=6;
  function holidayRows(body,year){return list(body).filter(r=>new RegExp(`^${year}-\\d{2}-\\d{2}$`).test(r?.date||'')&&text(r?.name)).map(r=>({date:r.date,name:text(r.name),localName:text(r.localName)||text(r.name)}));}
  const factRow=body=>text(body?.fact,700);
  function drinkRow(body){const r=list(body?.drinks)[0];if(!text(r?.strDrink)||!text(r?.strInstructions,4000))return null;const ingredients=[];for(let n=1;n<=15;n++){const ingredient=text(r['strIngredient'+n],100);if(ingredient)ingredients.push({ingredient,measure:text(r['strMeasure'+n],80)});}return {name:text(r.strDrink),category:text(r.strCategory,100),instructions:text(r.strInstructions,4000),image:imageURL(r.strDrinkThumb),ingredients};}
  function cachedArt(value){return value&&text(value.title)&&imageURL(value.image)?{title:text(value.title),artist:text(value.artist)||'Artist unknown',date:text(value.date,100),image:imageURL(value.image),source:text(value.source)}:null;}
  function create({store,meta,save=()=>{},changed=()=>{},fetcher=(...a)=>root.fetch(...a),now=()=>Date.now()}){
    let cache=store.get(KEY,{}) || {};if(typeof cache!=='object'||Array.isArray(cache))cache={};
    const state={art:{...FALLBACK_ART},kp:0},pending=new Map(),attempted=new Map(),controllers=new Set();let generation=0,nextTick=0;
    const enabled=()=>meta.liveExtras===true;
    function persist(){try{store.set(KEY,cache);}catch(e){/* the room still works if storage is full */}}
    const fresh=(entry,ttl)=>entry&&Number.isFinite(entry.at)&&now()>=entry.at&&now()-entry.at<ttl;
    async function request(address,ambient=false){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);if(ambient)controllers.add(controller);
      try{const r=await fetcher(address,{credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});if(!r.ok)return null;return await r.json();}catch(e){return null;}finally{clearTimeout(timer);controllers.delete(controller);}
    }
    function once(key,fn){if(pending.has(key))return pending.get(key);const p=Promise.resolve().then(fn);pending.set(key,p);p.finally(()=>{if(pending.get(key)===p)pending.delete(key);});return p;}
    async function radio(tag){if(!TAGS.includes(tag))return [];const old=cache.radio?.[tag];if(fresh(old,HOUR))return radioRows(old.rows);return once('radio:'+tag,async()=>{const rows=radioRows(await request(`https://de1.api.radio-browser.info/json/stations/bytag/${tag}?order=votes&reverse=true&limit=24&hidebroken=true`));if(rows.length){cache.radio={...(cache.radio||{}),[tag]:{at:now(),rows}};persist();return rows;}return radioRows(old?.rows);});}
    async function books(query){const q=text(query,120);if(!q)return [];return bookRows(await request(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=key,title,author_name,isbn`));}
    function savedBooks(){return [...new Set(list(store.get(BOOKS_KEY,[])).map(isbn).filter(Boolean))].slice(0,100);}
    function addBook(id){id=isbn(id);if(!id)return false;try{store.set(BOOKS_KEY,[...new Set([...savedBooks(),id])].slice(0,100));return true;}catch(e){return false;}}
    function removeBook(id){try{store.set(BOOKS_KEY,savedBooks().filter(i=>i!==id));}catch(e){/* optional local edit */}}
    async function fact(){return once('fact',async()=>{const live=factRow(await request('https://catfact.ninja/fact'));if(live){cache.facts=[...new Set([live,...list(cache.facts).map(v=>text(v,700)).filter(Boolean)])].slice(0,5);persist();return live;}const facts=list(cache.facts).map(v=>text(v,700)).filter(Boolean);return (facts.length?facts:FALLBACK_FACTS)[seed(dateKey(new Date(now())))%(facts.length||FALLBACK_FACTS.length)];});}
    async function drink(){return drinkRow(await request('https://www.thecocktaildb.com/api/json/v1/1/random.php')) || structuredClone(FALLBACK_DRINK);}
    async function loadArt(){
      const date=new Date(now()),day=dateKey(date),key='art:'+day,old=cache.art;
      if(fresh(old,DAY)&&old.day===day&&cachedArt(old.value)){state.art=cachedArt(old.value);return;}
      if(attempted.has(key))return;attempted.set(key,now());const token=generation;
      let rows=artRows(await request(`https://api.artic.edu/api/v1/artworks/search?query[term][is_public_domain]=true&query[term][has_image]=true&fields=id,title,artist_title,image_id,date_display&limit=60&page=${1+seed(day)%20}`,true)),art=rows.length?artForDay(rows,date):null;
      if(token!==generation||!enabled())return;
      if(!art){const ids=list((await request('https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=landscape',true))?.objectIDs).filter(Number.isInteger);if(ids.length&&token===generation&&enabled())art=metArt(await request(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${ids[seed(day)%ids.length]}`,true));}
      if(token!==generation||!enabled())return;
      if(art){cache.art={at:now(),day,value:art};persist();}state.art=art || cachedArt(old?.value) || {...FALLBACK_ART};changed();
    }
    async function loadKp(){const old=cache.kp;if(fresh(old,HOUR/2)&&Number.isFinite(old.value)){state.kp=old.value;return;}if(now()-(attempted.get('kp')??-Infinity)<HOUR/2)return;attempted.set('kp',now());const token=generation,kp=kpValue(await request('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',true));if(token!==generation||!enabled())return;if(kp!==null){cache.kp={at:now(),value:kp};persist();}state.kp=kp??(Number.isFinite(old?.value)?old.value:0);changed();}
    async function loadHolidays(year){const key='holidays:'+year,old=cache.holidays?.[year];if(fresh(old,366*DAY)||attempted.has(key))return;attempted.set(key,now());const token=generation,rows=holidayRows(await request(`https://date.nager.at/api/v3/PublicHolidays/${year}/CA`,true),year);if(token!==generation||!enabled())return;if(rows.length){cache.holidays={...(cache.holidays||{}),[year]:{at:now(),rows}};persist();changed();}}
    function holidaysFor(year){return enabled()?holidayRows(cache.holidays?.[year]?.rows,year):[];}
    function refresh(){if(!enabled())return Promise.resolve();return once('ambient:'+generation,()=>Promise.allSettled([loadArt(),loadKp(),loadHolidays(new Date(now()).getFullYear())]));}
    function setEnabled(on){generation++;for(const c of controllers)c.abort();controllers.clear();attempted.clear();meta.liveExtras=!!on;save();if(!on){state.art={...FALLBACK_ART};state.kp=0;}changed();return refresh();}
    function tick(){if(enabled()&&now()>=nextTick){nextTick=now()+60000;return refresh();}}
    return {state,enabled,setEnabled,refresh,tick,radio,books,savedBooks,addBook,removeBook,fact,drink,holidaysFor,ensureHolidays:year=>enabled()&&Number.isInteger(year)&&year>=1900&&year<=2200?loadHolidays(year):Promise.resolve()};
  }
  function register(L){
    L.def('galleryframe',{name:'Gallery frame',kind:'wall',group:'wall',size:[2,3],depth:3,tap:'atlas-art',vars:[[0xb58d67,0xf2e6ce],[0x71624f,0xe7dfd2]],build(m,[wood,paper]){
      m.box(0,0,0,16,24,2,wood).box(1,1,2,15,23,3,paper);
      // A local voxel landscape remains when Live extras is off or the image cannot load.
      m.box(2,3,3,14,9,4,0x9aaf91).box(2,9,3,7,12,4,0xb6c4a4).box(7,6,3,14,11,4,0x7d9a91).box(10,17,3,13,20,4,0xe5bf76);
    }});
    for(const id of BOOKSHELVES)if(L.CAT[id]&&!L.CAT[id].tap)L.CAT[id].tap='atlas-books';
  }
  function createView({model,view,room,sheet,meta,addStation=()=>{},hasStation=()=>false,hidden=()=>false}){
    const el=(tag,cls='',copy='')=>{const e=root.document.createElement(tag);e.className=cls;e.textContent=copy;return e;};
    const button=(label,fn)=>{const b=el('button','chipbtn',label);b.type='button';b.onclick=fn;return b;};
    const image=(src,alt)=>{const img=el('img','atlas-image');img.alt=alt;img.referrerPolicy='no-referrer';img.loading='lazy';img.onerror=()=>{img.hidden=true;};if(src)img.src=src;else img.hidden=true;return img;};
    const links=(host,rows)=>{for(const row of rows){const href=url(row.url);if(!href)continue;const a=el('a','chipbtn',row.label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';host.appendChild(a);}};
    const covers=new Map(),frames=new Map();let artImage=null,artKey='',artDetail=null,factId=null,factUntil=0,factToken=0;
    const bubble=el('div','toast companion-bubble atlas-fact');bubble.id='catFactBubble';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');root.document.body.appendChild(bubble);
    function mountRadio(host){
      host.appendChild(el('h2','','Browse stations'));const note=el('p','muted small','Pick a tag to browse. Adding a station never starts playback.'),tags=el('div','rowbtns'),rows=el('div','atlas-radio');host.append(note,tags,rows);let token=0;
      for(const tag of TAGS)tags.appendChild(button(tag,async()=>{
        const request=++token;rows.replaceChildren(el('p','muted','Tuning the directory…'));
        const found=await model.radio(tag);if(request!==token || !rows.isConnected)return;
        rows.replaceChildren();if(!found.length)rows.appendChild(el('p','muted','The directory is quiet. Your saved stations are still here.'));
        for(const row of found){const card=el('div','atlas-row'),copy=el('div');copy.append(el('b','',row.name),el('small','muted',`${row.codec || 'Radio'} · ${row.bitrate} kbps`));const add=button(hasStation(row.url)?'Added':'Add',()=>{addStation(stationFor(row));add.textContent='Added';add.disabled=true;});add.setAttribute('aria-label','Add '+row.name);add.disabled=hasStation(row.url);card.append(copy,add);rows.appendChild(card);}
      }));
    }
    function openBooks(portals=[]){
      sheet('Your bookshelf','',h=>{
        const saved=h('div','atlas-books');
        function draw(){saved.replaceChildren();const ids=model.savedBooks();if(!ids.length)saved.appendChild(el('p','muted','A little space for your next read.'));
          for(const id of ids){const tile=el('div','atlas-book'),title=covers.get(id)?.title || 'ISBN '+id;tile.append(image(coverURL(id),title),el('b','',title),el('small','muted',covers.get(id)?.author || id),button('Remove',()=>{model.removeBook(id);draw();}));saved.appendChild(tile);}}
        draw();const form=h('form','atlas-search'),input=el('input');input.placeholder='Title or author';input.setAttribute('aria-label','Find a book');input.maxLength=120;const search=el('button','chipbtn','Search');search.type='submit';form.append(input,search);form.hidden=true;
        const add=h('button','chipbtn','Add a book');add.onclick=()=>{form.hidden=false;input.focus();};
        const results=h('div','atlas-book-results');let token=0;
        form.onsubmit=async e=>{e.preventDefault();const q=input.value.trim();if(!q)return;const request=++token;results.replaceChildren(el('p','muted','Looking through the shelves…'));const books=await model.books(q);if(request!==token || !results.isConnected)return;results.replaceChildren();if(!books.length)results.appendChild(el('p','muted','No books found. Your shelf is still here.'));
          for(const book of books){const row=el('div','atlas-row'),copy=el('div');copy.append(image(coverURL(book.isbn),book.title),el('b','',book.title),el('small','muted',book.author));const pick=button('Add',()=>{if(model.addBook(book.isbn)){covers.set(book.isbn,book);pick.textContent='Added';pick.disabled=true;draw();}});pick.setAttribute('aria-label','Add '+book.title);row.append(copy,pick);results.appendChild(row);}
        };
        if(portals.length){h('h3','','Other links');const other=h('div','rowbtns');links(other,portals);}
      });
    }
    function openDrink(){
      sheet('Tonight’s drink','',h=>{
        const host=h('div','atlas-drink'),another=h('button','chipbtn','Another');let token=0;
        async function load(){const request=++token;another.disabled=true;host.replaceChildren(el('p','muted','Looking behind the bar…'));const d=await model.drink();if(request!==token || !host.isConnected)return;const list=el('ul');for(const i of d.ingredients)list.appendChild(el('li','',`${i.measure} ${i.ingredient}`.trim()));host.replaceChildren(el('h3','',d.name),el('p','muted',d.category),image(d.image,d.name),list,el('p','atlas-instructions',d.instructions));another.disabled=false;}
        another.onclick=load;load();
      });
    }
    function paintDetail(){if(!artDetail?.isConnected)return;const art=model.state.art || FALLBACK_ART;artDetail.replaceChildren(image(art.image,art.title),el('h3','',art.title),el('p','',art.artist),el('p','muted',art.date),el('small','muted',art.source));}
    function openArt(){sheet('Art of the day',model.enabled()?'':'Enable Live extras in Settings for public-domain art. This room-made landscape is always here.',h=>{artDetail=h('div','atlas-art-detail');paintDetail();});}
    async function catFact(id){const token=++factToken,items=room.items;const fact=await model.fact();if(token!==factToken || items!==room.items || room.get(id)?.t!=='cat')return;factId=id;factUntil=Date.now()+6500;bubble.textContent=fact;bubble.hidden=false;view.activity?.wake();}
    function dispose(entry){entry.mesh.removeFromParent();entry.mesh.geometry.dispose();entry.mesh.material.dispose();entry.texture.dispose();}
    function gallery(){
      const art=model.state.art || FALLBACK_ART,key=JSON.stringify(art);
      if(key!==artKey){artKey=key;artImage=null;paintDetail();if(model.enabled()&&imageURL(art.image)){const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';img.onload=()=>{if(key===artKey&&model.enabled()){artImage=img;for(const e of frames.values())e.signature='';view.activity?.wake();}};img.onerror=()=>{};img.src=art.image;}}
      const alive=new Set();
      for(const it of room.items){if(it.t!=='galleryframe')continue;const obj=view.objs.get(it.id);if(!obj)continue;alive.add(it.id);let entry=frames.get(it.id);
        if(entry?.obj!==obj){if(entry)dispose(entry);const canvas=root.document.createElement('canvas');canvas.width=400;canvas.height=600;const texture=new root.THREE.CanvasTexture(canvas),mesh=new root.THREE.Mesh(new root.THREE.PlaneGeometry(1.7,2.7),new root.THREE.MeshBasicMaterial({map:texture,side:root.THREE.DoubleSide}));texture.colorSpace=root.THREE.SRGBColorSpace;mesh.position.set(1,1.5,.515);obj.userData.inner.add(mesh);obj.userData.parts.privateAtlas=mesh;entry={obj,canvas,texture,mesh,signature:''};frames.set(it.id,entry);}
        entry.mesh.visible=model.enabled()&&!view.capturing&&!hidden();
        if(entry.signature!==artKey){const g=entry.canvas.getContext('2d');g.fillStyle='#efe5cc';g.fillRect(0,0,400,600);g.fillStyle='#a6b69b';g.fillRect(20,280,360,220);g.fillStyle='#7f9f98';g.fillRect(130,350,250,150);g.fillStyle='#dfbd78';g.fillRect(270,80,55,55);if(artImage){const k=Math.min(360/artImage.width,500/artImage.height),w=artImage.width*k,h=artImage.height*k;g.imageSmoothingEnabled=false;g.drawImage(artImage,(400-w)/2,20+(500-h)/2,w,h);}g.fillStyle='#4e4a42';g.font='18px monospace';g.fillText(art.title,20,550,360);entry.texture.needsUpdate=true;entry.signature=artKey;}
      }
      for(const [id,e] of frames)if(!alive.has(id)){dispose(e);frames.delete(id);}
    }
    function frame(){
      gallery();const aurora=root.document.getElementById('aurora'),on=auroraActive(model.state.kp,meta.phase,model.enabled());view.auroraOn=on;if(aurora && aurora.hidden===on)aurora.hidden=!on;
      if(factId!==null){const p=view.petAt(factId);bubble.hidden=!p || Date.now()>=factUntil || hidden() || !!root.document.querySelector('#sheet.open');if(!bubble.hidden){const companionBubble=root.document.getElementById('lampbotBubble');if(companionBubble)companionBubble.hidden=true;const point=view.root.localToWorld(p.clone().add(new root.THREE.Vector3(0,1.3,0))).project(view.cam),rect=view.r.domElement.getBoundingClientRect(),half=bubble.offsetWidth/2+12;bubble.style.left=Math.max(half,Math.min(root.innerWidth-half,rect.left+(point.x+1)*rect.width/2))+'px';bubble.style.top=Math.max(bubble.offsetHeight+12,Math.min(root.innerHeight-12,rect.top+(1-point.y)*rect.height/2))+'px';}if(Date.now()>=factUntil)factId=null;}
    }
    return {mountRadio,openBooks,openDrink,openArt,catFact,frame,bubble};
  }
  const api={KEY,BOOKS_KEY,HOUR,DAY,TAGS,BOOKSHELVES,FALLBACK_ART,FALLBACK_FACTS,FALLBACK_DRINK,url,dateKey,seed,radioRows,stationFor,artRows,artForDay,metArt,isbn,coverURL,bookRows,kpValue,auroraActive,holidayRows,factRow,drinkRow,create,createView,register};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else {root.LRAtlas=api;register(root.LR);}
})(typeof window!=='undefined'?window:globalThis);
