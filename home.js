// Cozy OS Home. Derived device-local data, with navigation delegated to the room's real tools.
(function(root) {
  const SECTIONS=['Tools and apps'];
  const MOTION_KEY='lr.reducedMotion';
  const PHASES={morning:'Morning',day:'Afternoon',evening:'Evening',night:'Night'};
  const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const reducedMotion=(store,system=false)=>store.get(MOTION_KEY,null) ?? system;
  function search(query,{CAT={},letters=[],scenes=[],ideas=[],rooms=[]}) {
    const q=String(query).trim().toLocaleLowerCase();if(!q)return [];
    return [
      ['Rooms',rooms.map(r=>({id:r.id,title:r.name}))],
      ['Furniture',Object.entries(CAT).map(([id,c])=>({id,title:c.name}))],
      ['Letters',letters.map(l=>({id:l.id,title:l.title || 'Untitled letter'}))],
      ['Scenes',scenes.map(s=>({id:s.id,title:s.title || 'Untitled scene'}))],
      ['Ideas',ideas.map(i=>({id:i.id,title:i.text}))],
    ].map(([type,items])=>({type,items:items.filter(i=>typeof i.title==='string'&&i.title.toLocaleLowerCase().includes(q))})).filter(g=>g.items.length);
  }
  function coziness({store,room={items:[]},roomId,plantsToday,now=new Date()}) {
    // Score = completed Daily Moments since local Monday + resident cats + plants
    // cared for today. lr.found has no timestamps: never claim dated discoveries.
    const monday=new Date(now);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
    const start=day(monday),today=day(now),log=store.get('lr.dailyLog',[]);
    const moments=new Set(log.filter(l=>l.date>=start&&l.date<=today).map(l=>l.date)).size;
    const cats=room.items.filter(i=>i.t==='cat'&&!i.visitor).length;
    const entries=store.get('lr.care',{})?.[roomId]?.items || {};
    const plants=plantsToday ?? room.items.filter(i=>['plant','herb'].includes(entries[i.id]?.k)&&entries[i.id]?.wd===today).length;
    const score=moments+cats+plants,mood=score>=5?'The room is humming':score?'The room is settling in':'A quiet beginning';
    return {moments,cats,plants,score,line:`${mood} · ${moments} daily moment${moments===1?'':'s'} this week · ${cats} cat${cats===1?'':'s'} · ${plants} plant${plants===1?'':'s'} cared for today`};
  }
  function snapshot(ctx) {
    const {store,meta={},tools={},merchant=false,now=new Date()}=ctx;
    const daily=ctx.daily || {D:store.get('lr.daily',{done:false}),name:'Daily moment',hint:'Find a cozy moment in your room.'};
    const tea=tools.tea,brewing=tea?.status==='brewing'&&tea.endAt>now.getTime(),ready=tea?.status==='ready'||tea?.status==='brewing'&&!brewing;
    const seconds=brewing?Math.ceil((tea.endAt-now.getTime())/1000):0;
    const teaLine=brewing?`Tea brewing · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} left`:ready?'Tea is ready':'The kettle is quiet';
    const unread=(tools.mail || []).filter(l=>!l.read&&(l.status==='arrived'||l.status==='sealed'&&l.deliverOn<=day(now))).length;
    const notifications=[];
    if(ready)notifications.push({id:'tea',title:'Your tea is ready',sub:'A little pause is waiting.',target:'tea'});
    if(!daily.D.done)notifications.push({id:'daily',title:'A daily moment is waiting',sub:daily.name,target:'daily'});
    if(merchant)notifications.push({id:'merchant',title:'Mallow is visiting',sub:'Three little treasures in his satchel.',target:'merchant'});
    if(unread)notifications.push({id:'mail',title:unread===1?'A letter has arrived':`${unread} letters have arrived`,sub:'A note from your past self.',target:'mailbox'});
    return {sections:SECTIONS,today:{date:now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'}),phase:PHASES[meta.phase] || 'Afternoon',clock:meta.realtime?'following the clock':'your chosen daypart',weather:({clear:'Clear',rain:'Rain',storm:'Storm',snow:'Snow'})[meta.weather] || 'Clear',daily,streak:store.get('lr.dailyStreak',{n:0}).n || 0,waiting:[teaLine,merchant?'Traveling merchant · visiting your room':'Traveling merchant · out wandering',unread?`${unread} future-self letter${unread===1?'':'s'} arrived`:'No letters waiting']},notifications,coziness:coziness({...ctx,now})};
  }
  let searchId=0;
  function createSearch({sources,navigate,toggleHost}) {
    const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const host=el('section','space-search');host.setAttribute('aria-label','Universal search');
    const input=el('input','home-search');input.type='search';input.placeholder='Search your space…';input.setAttribute('aria-label','Search furniture, letters, scenes, ideas');
    const toggle=el('button','space-search-toggle');toggle.type='button';toggle.setAttribute('aria-label','Search your space');toggle.setAttribute('aria-expanded','false');input.id='space-search-'+(++searchId);toggle.setAttribute('aria-controls',input.id);
    toggle.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
    const results=el('div','home-results');results.setAttribute('aria-live','polite');if(toggleHost){host.classList.add('has-external-toggle');toggleHost.prepend(toggle);host.append(input,results);}else host.append(toggle,input,results);
    let expanded=false;input.hidden=true;results.hidden=true;
    function collapse(){expanded=false;host.classList.remove('is-expanded');toggle.setAttribute('aria-expanded','false');input.value='';input.hidden=true;results.hidden=true;results.replaceChildren();input.dispatchEvent(new Event('input',{bubbles:true}));toggle.focus({preventScroll:true});}
    toggle.onclick=()=>{if(expanded){if(!input.value.trim())collapse();else input.focus();return;}expanded=true;host.classList.add('is-expanded');toggle.setAttribute('aria-expanded','true');input.hidden=false;results.hidden=false;searchResults();input.focus();};
    host.addEventListener('search-collapse',collapse);
    host.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded){e.preventDefault();e.stopPropagation();collapse();}});
    function searchResults(){results.replaceChildren();if(!expanded)return;const source=sources();const groups=search(input.value,source);
      if(!input.value.trim()||!groups.length){results.appendChild(el('p','muted',input.value.trim()?'No matches yet. Try another word.':'Furniture, letters, scenes, ideas.'));return;}
      for(const group of groups){const section=el('section','home-result-group');section.appendChild(el('h3','',group.type));for(const item of group.items.slice(0,30)){const b=el('button','home-row',item.title);b.type='button';b.onclick=()=>navigate(group.type,item);section.appendChild(b);}if(group.items.length>30)section.appendChild(el('p','muted small','Keep typing to narrow these results.'));results.appendChild(section);}
    }
    input.oninput=searchResults;
    searchResults();return host;
  }
  function createView({sheet,dismiss,apps=()=>[],preview=()=>null,previewKey=()=>'',actions,beforeOpen=()=>{},onClose=()=>{}}) {
    const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const view=el('section','home-view');view.id='homeView';view.setAttribute('aria-label','Control Centre apps');
    const settings=el('button','chipbtn sheet-icon home-settings');settings.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 3 1-1h4l1 3 2 1 3-1 2 3-2 2v3l2 2-2 3-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-3 2-2v-3L2 8l2-3 3 1 2-1Z"/><circle cx="12" cy="11" r="3"/></svg>';settings.title='Open Settings';settings.type='button';settings.setAttribute('aria-label','Open Settings');settings.onclick=()=>{depart(()=>actions.navigate('settings'),'settings');};
    const main=el('div','home-content');view.appendChild(main);const sections={};
    SECTIONS.forEach(name=>{const section=el('section','home-section');section.setAttribute('aria-label',name);main.appendChild(section);sections[name]=section;});
    const appSearch=el('input','home-search');appSearch.type='search';appSearch.placeholder='Find a tool or app';appSearch.setAttribute('aria-label','Find a tool or app');
    const appGrid=el('div','home-apps'),appEmpty=el('p','muted'),controls=el('div','home-app-controls');controls.appendChild(appSearch);sections['Tools and apps'].append(controls,appGrid,appEmpty);
    let shortcut=null;
    if(actions.chooseShortcut){shortcut=el('button','chipbtn sheet-icon home-shortcut');shortcut.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2-1 8h8L10 22l1-8H3Z"/></svg>';shortcut.type='button';shortcut.title='Set room shortcut';shortcut.setAttribute('aria-label','Set room shortcut');shortcut.onclick=()=>{depart(()=>actions.chooseShortcut(),'shortcut');};}
    let lastPreviewKey='';
    function updatePreviews(){const key=previewKey();if(key===lastPreviewKey)return;lastPreviewKey=key;const entries=new Map(apps().map(p=>[p.id,p]));for(const b of appGrid.querySelectorAll('[data-app]')){const p=entries.get(b.dataset.app),asset=p&&preview(p);let img=b.querySelector('.home-furniture');if(!asset){img?.remove();b.querySelector('.home-asset-hint')?.remove();continue;}if(!img){img=el('img','home-furniture');img.alt='';img.setAttribute('aria-hidden','true');b.appendChild(img);}if(img.getAttribute('src')!==asset.src)img.src=asset.src;img.classList.toggle('absent',!asset.present);img.dataset.furniture=asset.id;const hint=b.querySelector('.home-asset-hint') || el('small','home-asset-hint muted');hint.textContent=asset.present?'In your room':'Not placed in this room';b.appendChild(hint);}}
    function launchApps(){appGrid.replaceChildren();const q=appSearch.value.trim().toLocaleLowerCase(),rows=apps().filter(p=>(p.label+' '+(p.description || '')).toLocaleLowerCase().includes(q));appEmpty.textContent=rows.length?'':'No matching apps. Try another word.';
      for(const p of rows){const b=el('button','home-app'),icon=el('span','home-app-icon',p.icon),copy=el('span');b.type='button';b.dataset.app=p.id;icon.setAttribute('aria-hidden','true');if(p.iconSrc){const art=el('img','mail-access-icon');art.src=p.iconSrc;art.alt='';icon.replaceChildren(art);}copy.append(el('b','',p.label),el('small','muted',p.description));b.append(icon,copy);b.onclick=()=>{if(p.url){actions.launch(p);return;}depart(()=>actions.launch(p),p.id);};appGrid.appendChild(b);}
      const add=el('button','home-app');add.type='button';add.textContent='＋ Add your own';add.onclick=()=>depart(()=>actions.addPortal(),'add');appGrid.appendChild(add);lastPreviewKey=null;updatePreviews();
    }
    appSearch.oninput=launchApps;
    let active=false,next=0;
    function refresh(){if(active)updatePreviews();}
    function depart(run,focus){const restore={query:appSearch.value,top:view.closest('#sheetBody')?.scrollTop || 0,focus};closeView(false);if(actions.depart)actions.depart(run,()=>open({restore}));else run();}
    function open({restore}={}){
      if(active)return;
      beforeOpen();appSearch.value=restore?.query || '';launchApps();
      // codeSheet calls home.close(false). Mark active only after it has built
      // this sheet, so opening ourselves cannot recursively dismiss ourselves.
      sheet('Control Centre','Your tools and apps.',h=>{h('div','home-sheet-content').appendChild(view);const body=view.closest('#sheetBody'),close=body?.querySelector(':scope > .sheet-close');if(close){const tools=el('div','home-sheet-actions'),titles=el('div','home-sheet-title'),title=body.querySelector(':scope > h2'),sub=body.querySelector(':scope > p.muted');if(title)titles.appendChild(title);if(sub)titles.appendChild(sub);tools.append(titles,close);body.insertBefore(tools,body.querySelector(':scope > .home-sheet-content'));controls.appendChild(settings);if(shortcut)controls.appendChild(shortcut);}});
      active=true;
      const body=view.closest('#sheetBody');if(body)body.scrollTop=restore?.top || 0;
      const target=restore?(restore.focus==='settings'?settings:restore.focus==='shortcut'?shortcut:restore.focus==='add'?appGrid.lastElementChild:[...appGrid.querySelectorAll('[data-app]')].find(b=>b.dataset.app===restore.focus)):null;
      (target || (restore?appSearch:body?.querySelector('.sheet-close')))?.focus({preventScroll:true});
    }
    function closeView(focus=true){
      if(!active)return;active=false;
      if(view.contains(document.activeElement))document.activeElement.blur();
      view.remove();dismiss();if(focus)onClose();
    }
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    return {open,close:closeView,refresh,view,get active(){return active;},tick(time){if(!active||time<next)return;next=time+1000;refresh();updatePreviews();}};
  }
  const api={SECTIONS,MOTION_KEY,PHASES,day,reducedMotion,search,coziness,snapshot,createSearch,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRHome=api;
})(typeof window!=='undefined'?window:globalThis);
