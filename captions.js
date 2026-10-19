// TwoStoryTails' read-and-copy caption studio. Drafts stay in device storage, never decor.
(function(root) {
  // Owner config: blank hides the desk. Keep /raw/ unpinned so new exports arrive.
  const CAPTIONS_URL = 'https://gist.githubusercontent.com/dalecri/68454da1acd86b8860acd23a35c3206a/raw/twostorycaptions.json';
  const KEY = 'lr.captionDesk';
  // Exports can contain plain caption strings or labelled generated options.
  // Read their text only; never stringify metadata or rewrite the owner's words.
  function options(value) {
    return (Array.isArray(value) ? value : []).map(v => typeof v === 'string' ? v :
      typeof v?.text === 'string' ? v.text : typeof v?.caption === 'string' ? v.caption : '')
      .filter(v => v.trim().length);
  }
  function parse(data) {
    if (!data || data.exportedFrom !== 'TwoStoryCaptions' || !Array.isArray(data.clips)) return null;
    return {exportedFrom:data.exportedFrom, exportedAt:typeof data.exportedAt==='string' ? data.exportedAt : '',
      clips:data.clips.filter(c => c && typeof c.id==='string' && typeof c.desc==='string').map(c => ({
        id:c.id, desc:c.desc, status:typeof c.status==='string' ? c.status : '',
        created:typeof c.created==='string' ? c.created : '',
        selectedTones:Array.isArray(c.selectedTones) ? c.selectedTones.filter(t=>typeof t==='string') : [],
        platform:typeof c.platform==='string' ? c.platform : '', captions:options(c.captions)
      }))};
  }
  const rows = data => (data?.clips || []).filter(c=>c.status!=='published').slice().sort((a,b)=>
    ((Date.parse(b.created)||0)-(Date.parse(a.created)||0)) || a.id.localeCompare(b.id));
  // Local civil-day ordinal: midnight boundaries stay stable through DST.
  const dayIndex = date => Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
  function dailyRows(data,date=new Date()) {
    const pool=rows(data);if(!pool.length)return [];
    const start=((dayIndex(date)*3)%pool.length+pool.length)%pool.length;
    return Array.from({length:Math.min(3,pool.length)},(_,i)=>pool[(start+i)%pool.length]);
  }
  const copyPayload = clip => options(clip.captions)[0] ?? clip.desc;
  function create({store,url=CAPTIONS_URL,fetcher=(...args)=>root.fetch(...args),changed=()=>{},now=Date.now}) {
    let saved;try { saved=store.get(KEY,null); } catch(e) { /* storage unavailable */ }
    let data=saved?.url===url ? parse(saved.data) : null, cached=!!data, loading=false, failed=false, pending=null;
    function refresh() {
      if (!url || pending) return pending || Promise.resolve();
      loading=true;changed();
      pending=Promise.resolve().then(async()=>{
        const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),12000);
        try {
          const response=await fetcher(url,{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});
          if (!response.ok) throw Error('offline');
          const next=parse(await response.json());if(!next)throw Error('invalid export');
          data=next;cached=false;failed=false;
          try {store.set(KEY,{url,data,fetchedAt:now()});} catch(e) { /* reading and copying still work */ }
        } catch(e) {cached=!!data;failed=true;}
        finally {clearTimeout(timeout);loading=false;pending=null;changed();}
      });
      return pending;
    }
    return {refresh,get state(){return {enabled:!!url, data, rows:dailyRows(data,new Date(now())), cached, loading, failed};}};
  }
  async function copy(text,{navigator=root.navigator,document=root.document}={}) {
    try {await navigator.clipboard.writeText(text);return true;} catch(e) { /* older WebView or permission denied */ }
    const active=document.activeElement,area=document.createElement('textarea');area.value=text;
    area.setAttribute('aria-label','Caption to copy');area.style.cssText='position:fixed;left:0;top:0;opacity:0;font-size:16px';
    document.body.appendChild(area);area.focus({preventScroll:true});area.select();area.setSelectionRange(0,area.value.length);
    try {return document.execCommand('copy')===true;} catch(e) {return false;}
    finally {area.remove();active?.focus?.({preventScroll:true});}
  }
  // A tiny two-story house: two cats upstairs, one window and the door downstairs.
  const HOUSE=['.......oo.......','......orro......','.....orrrro.....','....orrrrrro....','...orrrrrrrro...','..oooooooooooo..','..owwwwwwwwwwo..','..owyyywwyyywo..','..owykywwykywo..','..owyyywwyyywo..','..oooooooooooo..','..owwwwwwwwwwo..','..owyyywwbbbwo..','..owykywwbbbwo..','..owyyywwbbbwo..','..oooooooooooo..'];
  const HOUSE_COLORS={o:'#2b2833',r:'#d9737f',w:'#fff1d6',y:'#f6d83c',k:'#2b2833',b:'#9a6b4f'};
  const house=()=>'<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'+HOUSE.flatMap((row,y)=>[...row].flatMap((c,x)=>HOUSE_COLORS[c]?[`<rect x="${x}" y="${y}" width="1" height="1" fill="${HOUSE_COLORS[c]}"/>`]:[])).join('')+'</svg>';
  // The caption studio: a pixel film reel of today's three unpublished clips.
  function render(host,model) {
    host.replaceChildren();const s=model.state;host.hidden=!s.enabled;if(host.hidden)return;
    const doc=host.ownerDocument;
    const add=(tag,cls,text,parent=host)=>{const el=doc.createElement(tag);el.className=cls;el.textContent=text;parent.appendChild(el);return el;};
    const head=add('div','caption-desk-head studio-head','');
    const art=add('span','studio-house','',head);art.innerHTML=house();
    const titles=add('div','studio-titles','',head);add('h4','','Caption studio',titles);
    const status=add('p','caption-desk-status',s.cached?'Cached · last saved export':s.failed?'The studio is offline. Refresh when you’re back.':s.loading?'Fetching the latest export…':'TwoStoryTails · unpublished',titles);status.setAttribute('role','status');
    if(s.data?.exportedAt){const date=new Date(s.data.exportedAt);if(Number.isFinite(date.getTime()))status.appendChild(doc.createTextNode(' · Exported '+date.toLocaleString()));}
    const refresh=add('button','caption-refresh',s.loading?'Refreshing…':'Refresh',head);refresh.type='button';refresh.disabled=s.loading;refresh.onclick=()=>model.refresh();
    if(!s.rows.length){add('p','caption-empty',s.loading?'Threading the film… one moment.':s.failed?'No clips reached the studio yet. Try Refresh when you’re online.':'Every clip is published. The studio cats are taking a well-earned nap.');return;}
    const reel=add('div','studio-reel','');
    s.rows.forEach((clip,index)=>{
      const article=add('article','caption-clip','',reel);
      const top=add('div','studio-frame-head','',article);add('span','studio-take',`CLIP ${String(index+1).padStart(2,'0')}`,top);
      const meta=add('div','caption-meta','',top);
      for(const tone of clip.selectedTones)add('span','caption-tag',tone,meta);
      if(clip.platform)add('small','caption-platform',clip.platform,meta);
      add('p','caption-desc',clip.desc,article);
      if(clip.captions.length){const list=add('ol','caption-options','',article);for(const option of clip.captions)add('li','',option,list);}
      const button=add('button','caption-copy','Copy',article);button.type='button';button.setAttribute('aria-label','Copy caption: '+clip.desc);
      button.onclick=async()=>{const ok=await copy(copyPayload(clip));button.textContent=ok?'Copied':'Copy failed';button.classList.toggle('is-copied',ok);button.setAttribute('aria-label',ok?'Caption copied':'Copy failed, try again');setTimeout(()=>{if(button.isConnected){button.textContent='Copy';button.classList.remove('is-copied');button.setAttribute('aria-label','Copy caption: '+clip.desc);}},1800);};
    });
    add('p','studio-foot','A new reel arrives at midnight.');
  }
  const api={CAPTIONS_URL,KEY,options,parse,rows,dayIndex,dailyRows,copyPayload,create,copy,render};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRCaptions=api;
})(typeof window!=='undefined'?window:globalThis);
