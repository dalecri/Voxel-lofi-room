// Private directories and files. Room items never store destinations or file contents.
(function(root) {
  const MENU_TABS = ['Today','Rooms','Journal','Sound','Settings'];
  const FILE_TABS = ['Letters','Scenes','Photos'];
  const EMPTY = {Letters:'No letters yet — the typewriter is waiting.',Scenes:'No scenes yet — build a memory, then save it as a scene.',Photos:'No photos yet — take one with the camera.'};
  const KEYS = {portals:'lr.portals',Letters:'lr.letters',Scenes:'lr.scenes',Photos:'lr.photos'};
  const url = value => {try {const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch(e){return '';}};
  // Read live catalog/widget definitions each time. Room-travel doors have no web
  // URL and must stay out of this directory. No second hardcoded app URL list.
  function destinations(CAT, widgets, custom=[]) {
    const rows=[];
    for(const [id,C] of Object.entries(CAT)) {
      if(C.tap==='portal' && url(C.link || C.url)) rows.push({furnitureId:id,label:C.name,url:url(C.link || C.url),icon:C.icon || '↗'});
      for(const p of widgets?.destinations(id) || []) rows.push({furnitureId:id,label:p.label || C.name,url:url(p.url),icon:C.icon || ({terrarium:'🫙',pomodorocandle:'🕯',arcade:'🎮',crt:'📺',libcase:'📚',gamingdesk:'⌨',tstcorkboard:'📌'})[id] || '↗'});
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
    names.forEach(name=>{const id=prefix+'-'+name.toLowerCase(),panel=element('section','dashboard-panel');panel.id=id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',id+'-tab');panels[name]=panel;
      const b=button(bar,name,()=>select(name));b.id=id+'-tab';b.setAttribute('role','tab');b.setAttribute('aria-controls',id);
    });
    Object.values(panels).forEach(p=>parent.appendChild(p));
    function select(name){names.forEach(n=>{const on=n===name,b=bar.querySelector('[aria-controls="'+panels[n].id+'"]');b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;panels[n].hidden=!on;});change(name);parent.closest('#sheetBody')?.scrollTo({top:0});}
    select(names.includes(selected)?selected:names[0]);return panels;
  }
  function tabKey(e){const list=e.target.closest?.('[role=tablist]');if(!list || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const b=[...list.querySelectorAll('[role=tab]')],i=b.indexOf(e.target);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?b.length-1:(i+(e.key==='ArrowRight'?1:b.length-1))%b.length;b[next].click();b[next].focus();}
  function menu(body,store,close){body.appendChild(element('div','grab'));button(body,'Close',close,'chipbtn sheet-close');body.appendChild(element('h2','','Your room'));body.appendChild(element('p','muted','A little space for your day.'));return tabs(body,MENU_TABS,store.get('lr.menuTab','Today'),name=>store.set('lr.menuTab',name),'menu');}
  function createView({model,CAT,widgets,sheet,letters,room,renderer,hidden,saveScene,openScene,encodeScene,placePortal,notice,onLaunch=()=>{},close=()=>{},localDestinations=[]}) {
    const safe=fn=>async()=>{try{await fn();}catch(e){notice(e.message || 'Could not open this file.');}};
    function launch(p){onLaunch(p);window.open(p.url,'_blank','noopener,noreferrer');}
    function launcher(){sheet('App launcher','Your destinations, together. Custom links stay on this device.',h=>{
      const search=h('input','dashboard-search');search.type='search';search.placeholder='Find an app';search.setAttribute('aria-label','Find an app');
      const grid=h('div','launcher-grid'),empty=h('p','muted');
      function draw(){grid.replaceChildren();const all=destinations(CAT,widgets,model.custom).concat(localDestinations),q=search.value.toLocaleLowerCase(),rows=all.filter(p=>p.label.toLocaleLowerCase().includes(q));empty.textContent=rows.length?'':'No matching destinations.';
        rows.forEach(p=>{const b=button(grid,'',()=>p.action?p.action():launch(p),'launcher-tile');const icon=element('span','launcher-icon',p.icon);icon.setAttribute('aria-hidden','true');b.append(icon,element('b','',p.label));b.title=p.url || p.label;});
        const add=button(grid,'',addPortal,'launcher-tile');const icon=element('span','launcher-icon','＋');icon.setAttribute('aria-hidden','true');add.append(icon,element('b','','Add your own'));
      }search.oninput=draw;draw();
    });}
    function addPortal(){sheet('Add your own','A name and a link. Saved privately on this device.',h=>{
      const form=h('form','dashboard-form'),label=element('label','','Name'),name=element('input'),ul=element('label','','URL'),input=element('input'),status=element('p','muted');name.required=true;name.maxLength=80;input.required=true;input.type='url';input.placeholder='https://…';label.appendChild(name);ul.appendChild(input);form.append(label,ul,status);
      const b=button(form,'Add destination',()=>{});b.type='submit';form.onsubmit=e=>{e.preventDefault();try{const p=model.addPortal(name.value,input.value);sheet('Destination added','Find it on the phone whenever you like.',h=>{h('p').textContent=`${p.label} is ready. Place a portal in your room for a direct shortcut.`;const row=h('div','rowbtns');button(row,'Place a portal',()=>placePortal(p));button(row,'Back to launcher',launcher);});}catch(e){status.textContent=e.message;}};
    });}
    function portal(it,key){const p=model.bound(key);if(p){launch(p);return;}sheet('Connect this portal','Choose one of your private destinations. Add links using the phone.',h=>{const list=h('div','widget-news');model.custom.forEach(p=>button(list,p.label,()=>{model.bind(key,p.id);close();launch(p);}));if(!model.custom.length)button(list,'Add a destination',addPortal);});}
    let fileTab='Letters';
    function files(tab=fileTab){fileTab=FILE_TABS.includes(tab)?tab:'Letters';letters.flush();sheet('Files','Letters, scenes and photos. Kept on this device, outside room shares.',h=>{
      const host=h('div'),panels=tabs(host,FILE_TABS,fileTab,n=>{fileTab=n;},'files');
      FILE_TABS.forEach(t=>{const panel=panels[t];
        if(t==='Scenes')button(panel,'Save current room as a scene',safe(async()=>{model.add('Scenes',{title:room().name,decor:saveScene()});files('Scenes');}));
        const rows=model.list(t);if(!rows.length)panel.appendChild(element('p','muted files-empty',EMPTY[t]));
        rows.forEach(f=>{const row=element('div','file-row'),info=element('div','file-info');button(info,f.title || 'Untitled',safe(()=>open(t,f)),'file-title');const date=new Date(f.updatedAt || f.createdAt || 0).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});info.appendChild(element('small','muted',date+(t==='Letters'?` · ${f.words} word${f.words===1?'':'s'}`:'')));row.appendChild(info);
          const more=element('details','file-more'),summary=element('summary','','•••');summary.setAttribute('aria-label','Actions for '+(f.title || 'Untitled'));more.appendChild(summary);const actions=element('div','file-actions');
          for(const [label,fn] of [['Open',()=>open(t,f)],['Rename',()=>rename(t,f)],['Download',()=>download(t,f)],['Share',()=>share(t,f)],['Delete',()=>remove(t,f)]])button(actions,label,safe(fn));more.appendChild(actions);row.appendChild(more);panel.appendChild(row);
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
    return {launcher,portal,files,openFile:open,frame,addPhoto(data,title){try{model.add('Photos',{data,title});}catch(e){notice('Photo is still open, but the cabinet is full. Download it to keep a copy.');}}};
  }
  const api={MENU_TABS,FILE_TABS,EMPTY,KEYS,url,destinations,create,tabs,tabKey,menu,createView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRDashboard=api;
})(typeof window!=='undefined'?window:globalThis);
