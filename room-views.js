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
  function mount({parent,rooms,current,thumb,travel,save,remove,newRoom,bedroom=()=>null,setBedroom=null,phase=()=> 'day'}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const host=el('section','rooms-views'),content=el('div','rooms-content');host.append(content);parent.append(host);
    // Legacy lr.roomsView values are deliberately ignored: the grid is the only layout.
    let query='',stopped=false,pending=null,observed=[],signature='';
    const makeButton=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
    function image(r){const wrap=el('span','rooms-art'),img=el('img');img.alt='';img.width=480;img.height=360;img.decoding='async';wrap.append(img);const hint=el('span','rooms-preview-hint','Loading preview…');wrap.append(hint);observed.push({img,wrap,hint,r});return wrap;}
    function info(r){const box=el('span','rooms-info');box.append(el('span','rooms-floor',floorOf(r)),el('b','rooms-name',r.name),el('span','rooms-description',description(r)));const pills=el('span','rooms-meta');{const n=count(r);pills.append(el("span","",`${n} item${n===1?"":"s"}`));}if(r.id===current())pills.append(el('span','rooms-here','you are here'));else if(r.draft)pills.append(el('span','','not saved'));box.append(pills);return box;}
    function manage(r,card){if(r.draft)card.append(makeButton('Save','chipbtn rooms-manage',save));else if(rooms().filter(r=>!r.draft).length>1)card.append(makeButton('Delete','rooms-delete',()=>remove(r.id)));}
    function card(r){const a=el('article','rooms-card'+(r.id===current()?' here':''));a.dataset.roomId=r.id;const b=makeButton('','rooms-visit',()=>travel(r));b.setAttribute('aria-label','Visit '+r.name);b.append(image(r),info(r));a.append(b);manage(r,a);
      if(setBedroom){const selected=bedroom()===r.id,star=makeButton('','rooms-bedroom',()=>{setBedroom(r);refresh();[...host.querySelectorAll('.rooms-card')].find(c=>c.dataset.roomId===String(r.id))?.querySelector('.rooms-bedroom')?.focus({preventScroll:true});});star.setAttribute('aria-label','Main bedroom for '+r.name);star.setAttribute('aria-pressed',String(selected));star.title=selected?'Main bedroom · Tap to clear':r.draft?'Save and set as main bedroom':'Set as main bedroom';star.innerHTML=`<svg viewBox="0 0 24 24" width="21" height="21" fill="${selected?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>`;a.appendChild(star);}
      return a;}
    function newCard(){const b=makeButton('＋ New room','rooms-new',newRoom);b.setAttribute('aria-label','＋ New room');b.innerHTML='<span class="rooms-new-plus" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span><b>New room</b><small>Start fresh</small>';return b;}
    function filtered(){return rooms().filter(r=>`${r.name} ${description(r)} ${floorOf(r)}`.toLocaleLowerCase().includes(query));}
    function loadImages(){pending=null;if(stopped || !host.isConnected || !host.getClientRects().length)return;const next=observed.shift();if(!next)return;try{const url=thumb(next.r);if(url){next.img.src=url;next.hint.remove();next.wrap.classList.add('ready');}else next.hint.textContent='Visit to make a preview';}catch(e){next.hint.textContent='Preview resting. Tap to visit.';}if(observed.length)pending=setTimeout(loadImages,32);}
    function schedule(){if(pending===null && observed.length && host.getClientRects().length)pending=setTimeout(loadImages,0);}
    function draw(){if(stopped)return;if(pending!==null)clearTimeout(pending);pending=null;observed=[];content.replaceChildren();host.dataset.view='grid';host.dataset.phase=phase();const list=filtered();
      if(!list.length)content.append(el('p','muted','No rooms match your search.'));
      // A gallery: the room you are in leads as a wide card, the rest sit two by two,
      // and a new room waits at the end. The sky behind each preview follows the time of day.
      const here=current(),grid=el('div','rooms-grid');
      [...list].sort((x,y)=>(y.id===here)-(x.id===here)).forEach(r=>grid.append(card(r)));grid.append(newCard());
      content.append(grid);schedule();
    }
    function refresh(){const key=JSON.stringify([rooms(),current(),phase(),bedroom()]);if(key!==signature){signature=key;draw();}else{schedule();}}
    const resize=new ResizeObserver(()=>{schedule();});resize.observe(content);
    const mutation=new MutationObserver(()=>{if(!host.isConnected){destroy();return;}schedule();});mutation.observe(parent,{attributes:true,attributeFilter:['hidden']});const sheet=parent.closest('.sheet');if(sheet)mutation.observe(sheet,{attributes:true,attributeFilter:['class']});
    function destroy(){stopped=true;if(pending!==null)clearTimeout(pending);resize.disconnect();mutation.disconnect();}
    refresh();return {el:host,refresh,destroy,filter(q){query=String(q).trim().toLocaleLowerCase();draw();}};
  }
  const api={SNAPSHOTS,floorOf,description,createSnapshots,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.LRRoomViews=api;
})(typeof window!=='undefined'?window:globalThis);
