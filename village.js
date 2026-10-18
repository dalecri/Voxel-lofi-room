// Static room previews and village navigation. No room, widget or file data is stored here.
(function (root) {
  'use strict';
  const DECOR = ['id','t','c','r','on','x','z','p','lx','lz','k','u','e','seed','crown','blanket','tipped'];
  function decorHash(room) {
    // A canonical decor fingerprint: titles, door destinations, visitors and private
    // tool contents cannot invalidate a picture that does not display them.
    return JSON.stringify([room.n || 10,room.view || 'city',room.wall?.style,room.wall?.color,room.floor?.style,room.floor?.color,room.gild || null,
      (room.items || []).filter(i=>!i.visitor && i.t!=='guestnote').map(i=>DECOR.map(k=>i[k] ?? null))]);
  }
  function createCache(limit = 48) {
    const entries = new Map();
    return {
      get(room, render) {
        const hash = decorHash(room), id = room.id ?? hash, old = entries.get(id);
        if (old?.hash === hash) { entries.delete(id); entries.set(id,old); return old.url; }
        const url = render(room);
        entries.delete(id); entries.set(id,{hash,url});
        while(entries.size > limit) entries.delete(entries.keys().next().value);
        return url;
      },
      clear() { entries.clear(); },
      get size() { return entries.size; }
    };
  }
  function bridges(rooms, CAT) {
    const ids = new Map(rooms.map(r=>[String(r.id),r.id])), seen = new Set(), out = [];
    for(const r of rooms) for(const it of r.items || []) {
      if(CAT[it.t]?.tap !== 'portal' || it.visitor || !ids.has(String(it.link)) || String(it.link)===String(r.id)) continue;
      const pair=[String(r.id),String(it.link)].sort(),key=JSON.stringify(pair);
      if(!seen.has(key)) { seen.add(key);out.push({from:ids.get(pair[0]),to:ids.get(pair[1])}); }
    }
    return out;
  }
  function layout(rooms, width) {
    width = Math.max(1,width);
    const w=Math.min(240,width*(width>=480?.44:.76)),h=w+64,gap=18;
    const wave=[-.9,.88,-.62,.96,-.96,.65],positions=[];
    for(let i=0;i<rooms.length;i++) {
      const x=(width-w)/2*(1+wave[i%wave.length]);
      let y=i ? positions[i-1].y+h*.62 : 12;
      for(const p of positions) if(x < p.x+w+gap && x+w+gap > p.x && y < p.y+h+gap) y=p.y+h+gap;
      positions.push({id:rooms[i].id,x,y,w,h});
    }
    return {width,height:positions.length?positions.at(-1).y+h+16:0,positions};
  }
  function connector(a,b) {
    const x1=a.x+a.w/2,y1=a.y+a.w*.8,x2=b.x+b.w/2,y2=b.y+b.w*.8,mid=(y1+y2)/2;
    return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
  }
  function mount({parent,rooms,current,CAT,thumb,travel,save,remove,newRoom}) {
    const el=document.createElement('div');el.className='village-map';el.setAttribute('aria-label','Your village');parent.appendChild(el);
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('village-bridges');svg.setAttribute('aria-label','Doors between rooms');el.appendChild(svg);
    let stopped=false,pending=null,idle=false,nodes=new Map(),signature='',positions=new Map();
    const queue=new Set(),body=parent.closest('#sheetBody');
    function cancel(){if(pending!==null){if(idle)cancelIdleCallback(pending);else clearTimeout(pending);}pending=null;queue.clear();}
    function visible(){return el.isConnected && el.getClientRects().length && !!el.closest('.sheet.open');}
    function schedule(){if(stopped || pending!==null || !queue.size || !visible())return;
      idle=typeof requestIdleCallback==='function';
      pending=idle?requestIdleCallback(work,{timeout:800}):setTimeout(work,32);
    }
    function work(){pending=null;if(stopped || !visible())return;
      const id=queue.values().next().value;queue.delete(id);const n=nodes.get(id);
      if(n && !n.ready){
        try {n.img.src=thumb(n.room);n.img.hidden=false;n.card.classList.add('ready');n.ready=true;}
        catch(e){n.status.textContent='Preview resting. Tap to visit.';}
      }
      schedule();
    }
    const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
      for(const e of entries){const n=nodes.get(e.target.dataset.roomId);if(!n)continue;if(e.isIntersecting && !n.ready)queue.add(String(n.room.id));else queue.delete(String(n.room.id));}schedule();
    },{root:body,rootMargin:'100px',threshold:0}):null;
    function arrange(){
      if(stopped || !el.getClientRects().length)return;
      const plan=layout([...nodes.values()].map(n=>n.room),el.clientWidth);el.style.height=plan.height+'px';positions=new Map(plan.positions.map(p=>[String(p.id),p]));
      for(const [id,n] of nodes){const p=positions.get(id);Object.assign(n.card.style,{left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'});}
      svg.setAttribute('viewBox',`0 0 ${plan.width} ${plan.height}`);svg.replaceChildren();
      for(const link of bridges([...nodes.values()].map(n=>n.room),CAT)){
        const a=positions.get(String(link.from)),b=positions.get(String(link.to)),g=document.createElementNS(ns,'g');g.classList.add('village-bridge');g.dataset.from=link.from;g.dataset.to=link.to;
        const title=document.createElementNS(ns,'title');title.textContent=nodes.get(String(link.from)).room.name+' to '+nodes.get(String(link.to)).room.name;g.appendChild(title);
        for(const cls of ['village-path-edge','village-path']){const path=document.createElementNS(ns,'path');path.setAttribute('d',connector(a,b));path.setAttribute('class',cls);g.appendChild(path);}
        const sign=document.createElementNS(ns,'path'),mx=(a.x+a.w/2+b.x+b.w/2)/2,my=(a.y+a.w*.8+b.y+b.w*.8)/2;
        sign.setAttribute('d',`M ${mx} ${my+8} v -18 m -7 0 h 14 l 5 4 -5 4 h -14 z`);sign.setAttribute('class','village-sign');g.appendChild(sign);svg.appendChild(g);
      }
      if(!observer){for(const [id,n] of nodes)if(!n.ready)queue.add(id);schedule();}
    }
    function refresh(){
      if(stopped || !el.isConnected)return;
      const list=rooms(),key=JSON.stringify(list.map(r=>[r.id,r.name,r.draft,decorHash(r),(r.items || []).map(i=>i.link || null)]));
      if(key===signature){arrange();return;}signature=key;cancel();observer?.disconnect();
      for(const n of nodes.values())n.card.remove();nodes=new Map();
      for(const r of list){
        const card=document.createElement('article');card.className='village-room'+(r.id===current()?' here':'')+(r.draft?' draft':'');card.dataset.roomId=r.id;
        const visit=document.createElement('button');visit.className='village-visit';visit.type='button';visit.setAttribute('aria-label',r.name+(r.id===current()?', you are here':''));visit.onclick=()=>travel(r);
        const art=document.createElement('span');art.className='village-art';const img=document.createElement('img');img.width=img.height=240;img.alt='';img.hidden=true;img.decoding='async';art.appendChild(img);
        const title=document.createElement('b');title.textContent=r.name;
        const status=document.createElement('span');status.className='village-status';status.textContent=r.id===current()?'you are here':r.draft?'not saved':`${(r.items || []).filter(i=>!i.visitor).length} things`;
        visit.append(art,title,status);card.appendChild(visit);
        if(r.draft || list.filter(r=>!r.draft).length>1){const b=document.createElement('button');b.className='chipbtn village-manage';b.textContent=r.draft?'Save':'✕';b.setAttribute('aria-label',(r.draft?'Save ':'Delete ')+r.name);b.onclick=()=>r.draft?save():remove(r.id);card.appendChild(b);}
        nodes.set(String(r.id),{room:r,card,img,status,ready:false});el.appendChild(card);observer?.observe(card);
      }
      arrange();
    }
    const resize=typeof ResizeObserver==='function'?new ResizeObserver(arrange):null;resize?.observe(el);
    const mutation=new MutationObserver(()=>{if(!el.isConnected){destroy();return;}if(visible()){arrange();schedule();}});
    mutation.observe(parent,{attributes:true,attributeFilter:['hidden']});const sheet=el.closest('.sheet');if(sheet)mutation.observe(sheet,{attributes:true,attributeFilter:['class']});mutation.observe(parent.parentNode,{childList:true});
    const add=document.createElement('button');add.className='chipbtn village-new';add.textContent='＋ New room';add.onclick=newRoom;parent.appendChild(add);
    window.addEventListener('resize',arrange);window.addEventListener('storage',refresh);
    function destroy(){if(stopped)return;stopped=true;cancel();observer?.disconnect();resize?.disconnect();mutation.disconnect();window.removeEventListener('resize',arrange);window.removeEventListener('storage',refresh);}
    refresh();return {refresh,destroy,el};
  }
  const api={decorHash,createCache,bridges,layout,connector,mount};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  root.LRVillage=api;
})(typeof window!=='undefined'?window:globalThis);
