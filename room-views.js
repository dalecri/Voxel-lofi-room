// Rooms diorama grid. Snapshots are private device caches, never room decor.
(function(root){
  'use strict';
  const SNAPSHOTS='lr.roomSnapshots';
  // Existing rooms have no storey field. Treat them as one ground-floor home;
  // never confuse room.floor (the material) with a floor-level assignment.
  const floorOf=r=>String(r.floorLabel ?? r.floorLevel ?? 'Ground floor');
  const count=r=>(r.items || []).filter(i=>!i.visitor).length;
  const description=r=>r.description || [r.floor?.style && `${r.floor.style} floors`,r.wall?.style && `${r.wall.style} walls`].filter(Boolean).join(' · ') || 'A little space of your own.';
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
  function mount({parent,rooms,current,thumb,travel,save,remove,newRoom,phase=()=> 'day'}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const host=el('section','rooms-views'),content=el('div','rooms-content');host.append(content);parent.append(host);
    // Legacy lr.roomsView values are deliberately ignored: the grid is the only layout.
    let query='',stopped=false,pending=null,observed=[],signature='';
    const makeButton=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
    function image(r){const wrap=el('span','rooms-art'),img=el('img');img.alt='';img.width=480;img.height=360;img.decoding='async';wrap.append(img);const hint=el('span','rooms-preview-hint','Loading preview…');wrap.append(hint);observed.push({img,wrap,hint,r});return wrap;}
    function info(r){const box=el('span','rooms-info');box.append(el('span','rooms-floor',floorOf(r)),el('b','rooms-name',r.name),el('span','rooms-description',description(r)));const pills=el('span','rooms-meta');pills.append(el('span','',`${count(r)} items`));if(r.id===current())pills.append(el('span','rooms-here','you are here'));else if(r.draft)pills.append(el('span','','not saved'));box.append(pills);return box;}
    function manage(r,card){if(r.draft)card.append(makeButton('Save','chipbtn rooms-manage',save));else if(rooms().filter(r=>!r.draft).length>1)card.append(makeButton('Delete','rooms-delete',()=>remove(r.id)));}
    function card(r){const a=el('article','rooms-card'+(r.id===current()?' here':''));a.dataset.roomId=r.id;const b=makeButton('','rooms-visit',()=>travel(r));b.setAttribute('aria-label','Visit '+r.name);b.append(image(r),info(r));a.append(b);manage(r,a);return a;}
    function newCard(){return makeButton('＋ New room','rooms-new',newRoom);}
    function filtered(){return rooms().filter(r=>`${r.name} ${description(r)} ${floorOf(r)}`.toLocaleLowerCase().includes(query));}
    function loadImages(){pending=null;if(stopped || !host.isConnected || !host.getClientRects().length)return;const next=observed.shift();if(!next)return;try{const url=thumb(next.r);if(url){next.img.src=url;next.hint.remove();next.wrap.classList.add('ready');}else next.hint.textContent='Visit to make a preview';}catch(e){next.hint.textContent='Preview resting. Tap to visit.';}if(observed.length)pending=setTimeout(loadImages,32);}
    function schedule(){if(pending===null && observed.length && host.getClientRects().length)pending=setTimeout(loadImages,0);}
    function draw(){if(stopped)return;if(pending!==null)clearTimeout(pending);pending=null;observed=[];content.replaceChildren();host.dataset.view='grid';host.dataset.phase=phase();const list=filtered();
      if(!list.length)content.append(el('p','muted','No rooms match your search.'));
      const grid=el('div','rooms-grid');list.forEach(r=>grid.append(card(r)));grid.append(newCard());content.append(grid);schedule();
    }
    function refresh(){const key=JSON.stringify([rooms(),current(),phase()]);if(key!==signature){signature=key;draw();}else{schedule();}}
    const resize=new ResizeObserver(()=>{schedule();});resize.observe(content);
    const mutation=new MutationObserver(()=>{if(!host.isConnected){destroy();return;}schedule();});mutation.observe(parent,{attributes:true,attributeFilter:['hidden']});const sheet=parent.closest('.sheet');if(sheet)mutation.observe(sheet,{attributes:true,attributeFilter:['class']});
    function destroy(){stopped=true;if(pending!==null)clearTimeout(pending);resize.disconnect();mutation.disconnect();}
    refresh();return {el:host,refresh,destroy,filter(q){query=String(q).trim().toLocaleLowerCase();draw();}};
  }
  const api={SNAPSHOTS,floorOf,description,createSnapshots,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.LRRoomViews=api;
})(typeof window!=='undefined'?window:globalThis);
