// Native Rooms layouts. Snapshots are private device caches, never room decor.
(function(root){
  'use strict';
  const village=root.LRVillage || (typeof require==='function'?require('./village.js'):null);
  const VIEWS=['grid','map','showcase'],KEY='lr.roomsView',SNAPSHOTS='lr.roomSnapshots';
  const viewOf=store=>VIEWS.includes(store.get(KEY,'grid'))?store.get(KEY,'grid'):'grid';
  function choose(store,view){if(!VIEWS.includes(view))return viewOf(store);store.set(KEY,view);return view;}
  // Existing rooms have no storey field. Treat them as one ground-floor home;
  // never confuse room.floor (the material) with a floor-level assignment.
  const floorOf=r=>String(r.floorLabel ?? r.floorLevel ?? 'Ground floor');
  const count=r=>(r.items || []).filter(i=>!i.visitor).length;
  const description=r=>r.description || [r.floor?.style && `${r.floor.style} floors`,r.wall?.style && `${r.wall.style} walls`].filter(Boolean).join(' · ') || 'A little space of your own.';
  function blueprint(rooms,width,CAT){
    width=Math.max(1,width);const gap=16,w=Math.min(180,width),cols=Math.max(1,Math.floor((width+gap)/(w+gap))),positions=[],groups=[];
    const floors=new Map();for(const r of rooms){const f=floorOf(r);if(!floors.has(f))floors.set(f,[]);floors.get(f).push(r);}
    let y=0;for(const [floor,list] of floors){groups.push({floor,y});y+=36;list.forEach((r,i)=>positions.push({id:r.id,x:(i%cols)*(w+gap),y:y+Math.floor(i/cols)*142,w,h:126}));y+=Math.ceil(list.length/cols)*142+20;}
    const points=new Map(positions.map(p=>[String(p.id),p]));
    const connectors=village.bridges(rooms,CAT).map(link=>({...link,a:points.get(String(link.from)),b:points.get(String(link.to))}));
    return {positions,groups,connectors,height:y,width};
  }
  function createSnapshots({store,hash,limit=24}){
    let entries=store.get(SNAPSHOTS,{});if(!entries || typeof entries!=='object' || Array.isArray(entries))entries={};
    return {
      get(id,phase){const e=entries[id];return e?{...e,url:e.shots?.[phase] || e.url}:null;},
      capture(room,phase,render,force=false){
        const key=String(room.id),fingerprint=hash(room),old=entries[key];
        if(!force && old?.hash===fingerprint && (old.shots?.[phase] || old.phase===phase))return old.shots?.[phase] || old.url;
        try{const result=render(),shots=typeof result==='object'&&result?result:null,url=shots?.[phase] || result;if(!/^data:image\/png;base64,/.test(url))return old?.url || null;
          entries[key]={hash:fingerprint,phase,url,...(shots?{shots}:{}),at:Date.now()};
          const keys=Object.keys(entries).sort((a,b)=>entries[b].at-entries[a].at);let bytes=0;
          for(let i=0;i<keys.length;i++){const k=keys[i];bytes+=JSON.stringify(entries[k]).length;if(i>=limit || (i>0 && bytes>2000000))delete entries[k];}
          // Best effort: a full device must still save/travel normally.
          store.set(SNAPSHOTS,entries);return url;
        }catch(e){return old?.url || null;}
      },
      remove(id){delete entries[id];store.set(SNAPSHOTS,entries);}
    };
  }
  function mount({parent,store,rooms,current,CAT,thumb,travel,save,remove,newRoom,phase=()=> 'day'}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const host=el('section','rooms-views'),switcher=el('div','rooms-switcher'),content=el('div','rooms-content');switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Rooms view');host.append(switcher,content);parent.append(host);
    let mode=viewOf(store),query='',selected=current(),stopped=false,pending=null,observed=[],signature='';
    const buttons=new Map(),names={grid:'Diorama grid',map:'House map',showcase:'Showcase'};
    for(const v of VIEWS){const b=el('button','',names[v]);b.type='button';b.onclick=()=>{mode=choose(store,v);draw();};switcher.append(b);buttons.set(v,b);}
    const makeButton=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
    function image(r){const wrap=el('span','rooms-art'),img=el('img');img.alt='';img.width=480;img.height=360;img.decoding='async';wrap.append(img);const hint=el('span','rooms-preview-hint','Loading preview…');wrap.append(hint);observed.push({img,wrap,hint,r});return wrap;}
    function info(r){const box=el('span','rooms-info');box.append(el('span','rooms-floor',floorOf(r)),el('b','rooms-name',r.name),el('span','rooms-description',description(r)));const pills=el('span','rooms-meta');pills.append(el('span','',`${count(r)} items`));if(r.id===current())pills.append(el('span','rooms-here','you are here'));else if(r.draft)pills.append(el('span','','not saved'));box.append(pills);return box;}
    function manage(r,card){if(r.draft)card.append(makeButton('Save','chipbtn rooms-manage',save));else if(rooms().filter(r=>!r.draft).length>1)card.append(makeButton('Delete','rooms-delete',()=>remove(r.id)));}
    function card(r,inspect=false){const a=el('article','rooms-card'+(r.id===current()?' here':''));a.dataset.roomId=r.id;const b=makeButton('','rooms-visit',()=>{if(inspect){selected=r.id;draw();}else travel(r);});b.setAttribute('aria-label',(inspect?'Inspect ':'Visit ')+r.name);if(inspect)b.setAttribute('aria-pressed',String(r.id===selected));b.append(image(r),info(r));a.append(b);manage(r,a);return a;}
    function newCard(){return makeButton('＋ New room','rooms-new',newRoom);}
    function arrange(){if(mode!=='map'||!content.getClientRects().length)return;const map=content.querySelector('.rooms-blueprint');if(!map)return;const list=filtered(),plan=blueprint(list,map.clientWidth,CAT);map.style.height=plan.height+'px';map.querySelectorAll('.rooms-floor-heading,.rooms-connectors').forEach(n=>n.remove());
      for(const p of plan.positions){const c=[...map.querySelectorAll('.rooms-card')].find(n=>n.dataset.roomId===String(p.id));if(c)Object.assign(c.style,{left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'});}
      for(const g of plan.groups){const label=el('h3','rooms-floor-heading',g.floor);label.style.top=g.y+'px';map.append(label);}
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('rooms-connectors');svg.setAttribute('aria-label','Portal links');svg.setAttribute('viewBox',`0 0 ${plan.width} ${Math.max(1,plan.height)}`);
      for(const {from,to,a,b} of plan.connectors){const line=document.createElementNS(ns,'path'),x=a.x+a.w/2,y=a.y+a.h/2,xx=b.x+b.w/2,yy=b.y+b.h/2;line.dataset.from=from;line.dataset.to=to;line.setAttribute('d',`M ${x} ${y} C ${x} ${(y+yy)/2}, ${xx} ${(y+yy)/2}, ${xx} ${yy}`);svg.append(line);}map.prepend(svg);
    }
    function filtered(){return rooms().filter(r=>`${r.name} ${description(r)} ${floorOf(r)}`.toLocaleLowerCase().includes(query));}
    function loadImages(){pending=null;if(stopped || !host.isConnected || !host.getClientRects().length)return;const next=observed.shift();if(!next)return;try{const url=thumb(next.r);if(url){next.img.src=url;next.hint.remove();next.wrap.classList.add('ready');}else next.hint.textContent='Visit to make a preview';}catch(e){next.hint.textContent='Preview resting. Tap to visit.';}if(observed.length)pending=setTimeout(loadImages,32);}
    function schedule(){if(pending===null && observed.length && host.getClientRects().length)pending=setTimeout(loadImages,0);}
    function draw(){if(stopped)return;if(pending!==null)clearTimeout(pending);pending=null;observed=[];content.replaceChildren();host.dataset.view=mode;host.dataset.phase=phase();for(const [v,b] of buttons)b.setAttribute('aria-pressed',String(v===mode));const list=filtered();
      if(!list.length)content.append(el('p','muted','No rooms match your search.'));
      if(mode==='grid'){const grid=el('div','rooms-grid');list.forEach(r=>grid.append(card(r)));grid.append(newCard());content.append(grid);}
      else if(mode==='map'){const map=el('div','rooms-blueprint');list.forEach(r=>map.append(card(r)));content.append(map,newCard());}
      else {const split=el('div','rooms-showcase'),listEl=el('div','rooms-list'),hero=el('div','rooms-hero');if(!list.some(r=>r.id===selected))selected=list[0]?.id;list.forEach(r=>listEl.append(card(r,true)));listEl.append(newCard());const r=list.find(r=>r.id===selected);if(r){hero.dataset.roomId=r.id;hero.append(image(r),info(r));if(r.id!==current())hero.append(makeButton('Step inside','chipbtn primary',()=>travel(r)));}split.append(listEl,hero);content.append(split);}
      arrange();schedule();
    }
    function refresh(){const key=JSON.stringify([rooms(),current(),phase()]);if(key!==signature){signature=key;draw();}else{arrange();schedule();}}
    const resize=new ResizeObserver(()=>{arrange();schedule();});resize.observe(content);
    const mutation=new MutationObserver(()=>{if(!host.isConnected){destroy();return;}arrange();schedule();});mutation.observe(parent,{attributes:true,attributeFilter:['hidden']});const sheet=parent.closest('.sheet');if(sheet)mutation.observe(sheet,{attributes:true,attributeFilter:['class']});
    function destroy(){stopped=true;if(pending!==null)clearTimeout(pending);resize.disconnect();mutation.disconnect();}
    refresh();return {el:host,refresh,destroy,filter(q){query=String(q).trim().toLocaleLowerCase();draw();}};
  }
  const api={VIEWS,KEY,SNAPSHOTS,viewOf,choose,floorOf,description,blueprint,createSnapshots,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.LRRoomViews=api;
})(typeof window!=='undefined'?window:globalThis);
