// Private directories and files. Room items never store destinations or file contents.
(function(root) {
  const MENU_TABS = ['Today','Rooms','To-Do','Sound','Settings'];
  const MENU_ICONS = {
    Today:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    Rooms:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
    'To-Do':'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M8 15l1.5 1.5L12 14M14 9.5h3M14 15.5h3"/>',
    Sound:'<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
    Settings:'<path d="m9 3 1-1h4l1 3 2 1 3-1 2 3-2 2v3l2 2-2 3-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-3 2-2v-3L2 8l2-3 3 1 2-1Z"/><circle cx="12" cy="11" r="3"/>'
  };
  const FILE_TABS = ['Letters','Scenes','Photos'];
  const EMPTY = {Letters:'No notes yet — the notetaker is waiting.',Scenes:'No scenes yet — build a memory, then save it as a scene.',Photos:'No photos yet — take one with the camera.'};
  const KEYS = {portals:'lr.portals',Letters:'lr.letters',Scenes:'lr.scenes',Photos:'lr.photos'};
  const url = value => {try {const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch(e){return '';}};
  // Read live catalog/widget definitions each time. Room-travel doors have no web
  // URL and must stay out of this directory. No second hardcoded app URL list.
  function destinations(CAT, widgets, custom=[]) {
    const rows=[];
    for(const [id,C] of Object.entries(CAT)) {
      if(C.tap==='portal' && url(C.link || C.url)) rows.push({furnitureId:id,label:C.name,url:url(C.link || C.url),icon:C.icon || '↗'});
      for(const p of widgets?.destinations(id) || []) rows.push({furnitureId:id,label:p.label || C.name,url:url(p.url),...(id==='arcade'?{inApp:true}:{}),icon:C.icon || ({terrarium:'🫙',pomodorocandle:'🕯',arcade:'🎮',crt:'📺',libcase:'📚',gamingdesk:'⌨',tstcorkboard:'📌'})[id] || '↗'});
    }
    rows.push(...custom.map(p=>({...p,url:url(p.url),icon:'☆',custom:true})));
    const seen=new Set();return rows.filter(p=>p.url && !seen.has(p.url) && seen.add(p.url));
  }
  function create({store,letters,now=()=>Date.now()}) {
    const read=tab=>{const s=store.get(KEYS[tab],null);return (Array.isArray(s)?s:Array.isArray(s?.files)?s.files:tab==='Letters' && Array.isArray(s?.letters)?s.letters:[]).filter(f=>f && typeof f.id==='string');};
    const counts={Scenes:read('Scenes').length,Photos:read('Photos').length};
    root.addEventListener?.('storage',e=>{for(const t of ['Scenes','Photos'])if(!e.key || e.key===KEYS[t])counts[t]=read(t).length;});
    function write(key,value){store.set(key,value);if(JSON.stringify(store.get(key,null))!==JSON.stringify(value))throw Error('Could not save on this device. Try downloading a copy.');}
    function portalState(){const s=store.get(KEYS.portals,null) || {};return {next:s.next || 1,custom:Array.isArray(s.custom)?s.custom:[],bindings:s.bindings && typeof s.bindings==='object'?s.bindings:{}};}
    function list(tab){return tab==='Letters'?(letters?.list() || read('Letters')).map(l=>({...l,words:text(l.body).trim().split(/\s+/).filter(Boolean).length})):read(tab).map(f=>({...f}));}
    function text(html){return String(html || '').replace(/<br\s*\/?\s*>|<\/(?:p|div)>/gi,' ').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ');}
    function add(tab,entry){if(!['Scenes','Photos'].includes(tab))return;const files=read(tab),t=now(),id=`${tab.toLowerCase()}-${t.toString(36)}-${Math.random().toString(36).slice(2,9)}`;const f={...entry,id,createdAt:t,updatedAt:t};write(KEYS[tab],{v:1,files:[f,...files]});counts[tab]=files.length+1;return f;}
    function rename(tab,id,title){if(tab==='Letters')return letters?.rename(id,title);const files=read(tab),f=files.find(f=>f.id===id);if(!f)return false;f.title=String(title).trim() || 'Untitled';f.updatedAt=now();write(KEYS[tab],{v:1,files});return true;}
    function remove(tab,id){if(tab==='Letters')return letters?.remove(id);const files=read(tab);if(!files.some(f=>f.id===id))return false;const remaining=files.filter(f=>f.id!==id);write(KEYS[tab],{v:1,files:remaining});counts[tab]=remaining.length;return true;}
    function addPortal(label,value){label=String(label).trim();const link=url(value);if(!label || !link)throw Error('Add a name and a full http or https URL.');const s=portalState(),p={id:'custom-'+s.next++,label:label.slice(0,80),url:link};s.custom.push(p);write(KEYS.portals,s);return p;}
    return {list,add,rename,remove,addPortal,get custom(){return portalState().custom.filter(p=>p && p.id && url(p.url)).map(p=>({...p,url:url(p.url)}));},
      bind(key,id){const s=portalState();s.bindings[key]=id;write(KEYS.portals,s);},bound(key){const s=portalState();return s.custom.find(p=>p.id===s.bindings[key] && url(p.url));},
      get count(){return (letters?.list() || read('Letters')).length+counts.Scenes+counts.Photos;}};
  }
  function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function button(parent,label,fn,cls='chipbtn'){const b=element('button',cls,label);b.type='button';b.onclick=fn;parent.appendChild(b);return b;}
  function tabs(parent,names,selected,change,prefix) {
    const bar=element('div','dashboard-tabs');bar.setAttribute('role','tablist');bar.setAttribute('aria-label',prefix==='menu'?'Menu sections':'File categories');parent.appendChild(bar);
    const panels={};
    names.forEach(name=>{const id=prefix+'-'+name.toLowerCase().replace(/[^a-z]/g,''),panel=element('section','dashboard-panel');panel.id=id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',id+'-tab');panels[name]=panel;
      const b=button(bar,name,()=>select(name));b.id=id+'-tab';b.setAttribute('role','tab');b.setAttribute('aria-controls',id);
    });
    Object.values(panels).forEach(p=>parent.appendChild(p));
    function select(name){names.forEach(n=>{const on=n===name,b=bar.querySelector('[aria-controls="'+panels[n].id+'"]'),showing=on&&panels[n].hidden;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;panels[n].hidden=!on;
      // A newly chosen tab drifts in rather than snapping into place.
      if(showing&&panels[n].animate&&!document.body.classList.contains('reduce-motion'))panels[n].animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});});change(name);parent.closest('#sheetBody')?.scrollTo({top:0});}
    select(names.includes(selected)?selected:names[0]);return panels;
  }
  function tabKey(e){const list=e.target.closest?.('[role=tablist]');if(!list || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const b=[...list.querySelectorAll('[role=tab]')],i=b.indexOf(e.target);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?b.length-1:(i+(e.key==='ArrowRight'?1:b.length-1))%b.length;b[next].click();b[next].focus();}
  function menu(body,store,close,onSelect=()=>{}) {
    // The old Journal tab is now the To-Do tab; a saved 'Journal' choice lands there.
    const saved=store.get('lr.menuTab','Today');
    const panels=tabs(body,MENU_TABS,saved==='Journal'?'To-Do':saved,name=>{store.set('lr.menuTab',name);onSelect(name);},'menu');
    const bar=body.querySelector('[role=tablist]'),nav=element('div','menu-nav');bar.classList.add('menu-tabs');body.insertBefore(nav,bar);nav.appendChild(bar);
    for(const name of MENU_TABS){const b=bar.querySelector('[aria-controls="menu-'+name.toLowerCase().replace(/[^a-z]/g,'')+'"]');b.setAttribute('aria-label',name);b.title=name;b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+MENU_ICONS[name]+'</svg>';}
    // On narrow phones the tabs scroll while the two actions stay fixed.
    const revealTab=()=>{if(!nav.isConnected)return;const tab=bar.querySelector('[aria-selected=true]');if(!tab)return;const a=tab.getBoundingClientRect(),b=bar.getBoundingClientRect();if(a.right>b.right)bar.scrollLeft+=a.right-b.right;else if(a.left<b.left)bar.scrollLeft-=b.left-a.left;};
    bar.addEventListener('click',revealTab);requestAnimationFrame(revealTab);
    const grab=element('div','grab');body.insertBefore(grab,panels.Today);
    const actions=element('div','menu-actions');actions.setAttribute('role','group');actions.setAttribute('aria-label','Sheet actions');nav.appendChild(actions);
    const closeButton=button(actions,'',close,'sheet-close sheet-icon');closeButton.setAttribute('aria-label','Close');
    closeButton.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    return panels;
  }
  function createView({model,CAT,widgets,sheet,letters,room,renderer,hidden,saveScene,openScene,encodeScene,placePortal,notice,onLaunch=()=>{},close=()=>{},localDestinations=[],games=null}) {
    const safe=fn=>async()=>{try{await fn();}catch(e){notice(e.message || 'Could not open this file.');}};
    // HTML games open the in-app game library; every other destination opens its link.
    function launch(p){onLaunch(p);if(games&&p.furnitureId==='arcade'){games();return;}window.open(p.url,'_blank','noopener,noreferrer');}
    function launcher(){sheet('App launcher','',h=>{
      const search=h('input','dashboard-search');search.type='search';search.placeholder='Find an app';search.setAttribute('aria-label','Find an app');
      const grid=h('div','launcher-grid'),empty=h('p','muted');
      function draw(){grid.replaceChildren();const all=destinations(CAT,widgets,model.custom).concat(typeof localDestinations==='function'?localDestinations():localDestinations),q=search.value.toLocaleLowerCase(),rows=all.filter(p=>p.label.toLocaleLowerCase().includes(q));empty.textContent=rows.length?'':'No matching destinations.';
        rows.forEach(p=>{const b=button(grid,'',()=>p.action?p.action():launch(p),'launcher-tile');const icon=element('span','launcher-icon',p.icon);icon.setAttribute('aria-hidden','true');if(p.iconSrc){const art=element('img','mail-access-icon');art.src=p.iconSrc;art.alt='';icon.replaceChildren(art);}b.append(icon,element('b','',p.label));b.title=p.url || p.label;});
        const add=button(grid,'',addPortal,'launcher-tile');const icon=element('span','launcher-icon','＋');icon.setAttribute('aria-hidden','true');add.append(icon,element('b','','Add your own'));
      }search.oninput=draw;draw();
    });}
    function addPortal(){sheet('Add your own','',h=>{
      const form=h('form','dashboard-form'),label=element('label','','Name'),name=element('input'),ul=element('label','','URL'),input=element('input'),status=element('p','muted');name.required=true;name.maxLength=80;input.required=true;input.type='url';input.placeholder='https://…';label.appendChild(name);ul.appendChild(input);form.append(label,ul,status);
      const b=button(form,'Add destination',()=>{});b.type='submit';form.onsubmit=e=>{e.preventDefault();try{const p=model.addPortal(name.value,input.value);sheet('Destination added','Find it on the phone whenever you like.',h=>{h('p').textContent=`${p.label} is ready. Place a portal in your room for a direct shortcut.`;const row=h('div','rowbtns');button(row,'Place a portal',()=>placePortal(p));button(row,'Back to launcher',launcher);});}catch(e){status.textContent=e.message;}};
    });}
    function portal(it,key){const p=model.bound(key);if(p){launch(p);return;}sheet('Connect this portal','Choose one of your private destinations. Add links using the phone.',h=>{const list=h('div','widget-news');model.custom.forEach(p=>button(list,p.label,()=>{model.bind(key,p.id);close();launch(p);}));if(!model.custom.length)button(list,'Add a destination',addPortal);});}
    let fileTab='Letters';
    function files(tab=fileTab){fileTab=FILE_TABS.includes(tab)?tab:'Letters';letters.flush();sheet('Files','',h=>{
      const host=h('div'),panels=tabs(host,FILE_TABS,fileTab,n=>{fileTab=n;},'files');
      FILE_TABS.forEach(t=>{const panel=panels[t];
        // A memory shelf: paper cards for letters, framed snapshots for scenes, a polaroid wall for photos.
        const grid=element('div','file-grid file-grid-'+t.toLowerCase());
        if(t==='Scenes'){const add=button(grid,'',safe(async()=>{model.add('Scenes',{title:room().name,decor:saveScene()});files('Scenes');}),'file-add');add.setAttribute('aria-label','Save current room as a scene');add.innerHTML='<span aria-hidden="true">+</span><b>Save this room</b>';}
        const rows=model.list(t);if(!rows.length)panel.appendChild(element('p','muted files-empty',EMPTY[t]));panel.appendChild(grid);
        rows.forEach((f,i)=>{const row=element('div','file-row file-card'),info=element('div','file-info');row.style.setProperty('--tilt',['-1.6deg','1.2deg','-.7deg','1.8deg','-1.1deg'][i%5]);
          if(t==='Letters'){const words=String(f.body||'').replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi,' ').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();row.appendChild(element('p','file-preview',words?words.slice(0,140):'An empty page.'));}
          else{const src=t==='Photos'?(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(f.data||'')?f.data:''):(()=>{try{return f.decor?renderer()?.roomThumb?.({...f.decor,id:f.id})||'':'';}catch(e){return '';}})();
            const frame=element('button','file-frame');frame.type='button';frame.setAttribute('aria-label','Open '+(f.title||'Untitled'));frame.onclick=safe(()=>open(t,f));if(src){const img=element('img');img.src=src;img.alt='';img.loading='lazy';frame.appendChild(img);}else frame.appendChild(element('span','file-frame-empty',t==='Photos'?'◎':'▧'));row.appendChild(frame);}button(info,f.title || 'Untitled',safe(()=>open(t,f)),'file-title');const date=new Date(f.updatedAt || f.createdAt || 0).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});info.appendChild(element('small','muted',date+(t==='Letters'?` · ${f.words} word${f.words===1?'':'s'}`:'')));row.appendChild(info);
          const more=element('details','file-more'),summary=element('summary','','•••');summary.setAttribute('aria-label','Actions for '+(f.title || 'Untitled'));more.appendChild(summary);const actions=element('div','file-actions');
          for(const [label,fn] of [['Open',()=>open(t,f)],['Rename',()=>rename(t,f)],['Download',()=>download(t,f)],['Share',()=>share(t,f)],['Delete',()=>remove(t,f)]])button(actions,label,safe(fn));more.appendChild(actions);row.appendChild(more);grid.appendChild(row);
        });
      });
    });}
    function open(t,f){if(t==='Letters'){letters.model.select(f.id);letters.open();}else if(t==='Scenes')openScene(f);else sheet(LRLetters.escapeHTML(f.title || 'Photo'),'A moment from your room.',h=>{const img=h('img','file-photo');if(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(f.data || '')){img.src=f.data;img.alt=f.title || 'Room photo';}else h('p','muted','This photo could not be read.');});}
    function rename(t,f){sheet('Rename file','Choose a title.',h=>{const form=h('form','dashboard-form'),label=element('label','','Title'),input=element('input');input.value=f.title || '';input.maxLength=120;label.appendChild(input);form.appendChild(label);const b=button(form,'Save title',()=>{});b.type='submit';form.onsubmit=e=>{e.preventDefault();safe(()=>{model.rename(t,f.id,input.value);files(t);})()};});}
    function remove(t,f){sheet('Delete this file?', 'This removes it from this device.',h=>{h('p').textContent=f.title || 'Untitled';const row=h('div','rowbtns');button(row,'Delete file',safe(()=>{model.remove(t,f.id);files(t);}));button(row,'Keep it',()=>files(t));});}
    async function payload(t,f){const date=new Date(f.createdAt || Date.now()).toISOString().slice(0,10);
      if(t==='Letters')return {filename:`letter-${date}.html`,type:'text/html',data:LRLetters.htmlFile(f)};
      if(t==='Scenes'){const code=await encodeScene(f.decor);return {filename:`scene-${date}.html`,type:'text/html',data:LRLetters.htmlFile({title:f.title,letterhead:f.title,body:'<p>Open a friend’s code in Lofi Rooms and paste this scene:</p><p>'+LRLetters.escapeHTML(code)+'</p>'})};}
      if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(f.data || ''))throw Error('This photo could not be read.');return {filename:`photo-${date}.png`,type:'image/png',data:f.data};
    }
    function blob(p){return p.type==='image/png'?fetch(p.data).then(r=>r.blob()):Promise.resolve(new Blob([p.data],{type:p.type}));}
    async function nativeShare(p,title){const cap=root.Capacitor,file=await cap.registerPlugin('Filesystem').writeFile({path:p.filename,data:p.type==='image/png'?p.data.split(',')[1]:btoa(unescape(encodeURIComponent(p.data))),directory:'CACHE'});await cap.registerPlugin('Share').share({title,files:[file.uri]});}
    async function download(t,f){const p=await payload(t,f);if(root.Capacitor?.isNativePlatform?.()){if(p.type==='text/html')await LRLetters.saveFile({html:p.data,filename:p.filename});else await nativeShare(p,f.title);return;}const object=URL.createObjectURL(await blob(p)),a=element('a');a.href=object;a.download=p.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(object),60000);}
    async function share(t,f){try{const p=await payload(t,f);if(root.Capacitor?.isNativePlatform?.()){await nativeShare(p,f.title);return;}const file=new File([await blob(p)],p.filename,{type:p.type});if(navigator.canShare?.({files:[file]})){await navigator.share({title:f.title,files:[file]});return;}await download(t,f);notice('File downloaded. You can attach it to a message.');}catch(e){if(e.name!=='AbortError' && !/cancel/i.test(e.message || ''))throw e;}}
    let next=0;
    function frame(){if(performance.now()<next)return;next=performance.now()+1000;const cabinets=room().items.filter(it=>it.t==='filecab');if(!cabinets.length)return;const count=model.count,v=renderer();for(const it of cabinets){const p=v.objs.get(it.id)?.userData.parts;if(!p)continue;for(let n=0;n<3;n++)if(p['privateFiles'+n])p['privateFiles'+n].visible=!hidden() && !v.capturing && count>n*4;}}
    return {launcher,launch,addPortal,portal,files,openFile:open,frame,addPhoto(data,title){try{model.add('Photos',{data,title});}catch(e){notice('Photo is still open, but the cabinet is full. Download it to keep a copy.');}}};
  }
  const api={MENU_TABS,FILE_TABS,EMPTY,KEYS,url,destinations,create,tabs,tabKey,menu,createView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRDashboard=api;
})(typeof window!=='undefined'?window:globalThis);
