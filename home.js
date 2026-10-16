// Cozy OS Home. Derived device-local data, with navigation delegated to the room's real tools.
(function(root) {
  const SECTIONS=['Tools and apps'];
  const MOTION_KEY='lr.reducedMotion';
  const PHASES={morning:'Morning',day:'Afternoon',evening:'Evening',night:'Night'};
  const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const reducedMotion=(store,system=false)=>store.get(MOTION_KEY,null) ?? system;
  function search(query,{CAT={},letters=[],scenes=[],ideas=[]}) {
    const q=String(query).trim().toLocaleLowerCase();if(!q)return [];
    return [
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
  function createSearch({sources,navigate}) {
    const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const host=el('section','space-search');host.setAttribute('aria-label','Universal search');
    const input=el('input','home-search');input.type='search';input.placeholder='Search your space…';input.setAttribute('aria-label','Search furniture, letters, scenes, ideas');
    const results=el('div','home-results');results.setAttribute('aria-live','polite');host.append(input,results);
    function searchResults(){const source=sources();results.replaceChildren();const groups=search(input.value,source);
      if(!input.value.trim()||!groups.length){results.appendChild(el('p','muted',input.value.trim()?'No matches yet. Try another word.':'Furniture, letters, scenes, ideas.'));return;}
      for(const group of groups){const section=el('section','home-result-group');section.appendChild(el('h3','',group.type));for(const item of group.items.slice(0,30)){const b=el('button','home-row',item.title);b.type='button';b.onclick=()=>navigate(group.type,item);section.appendChild(b);}if(group.items.length>30)section.appendChild(el('p','muted small','Keep typing to narrow these results.'));results.appendChild(section);}
    }
    input.oninput=searchResults;
    searchResults();return host;
  }
  function createView({apps=()=>[],preview=()=>null,previewKey=()=>'',actions,beforeOpen=()=>{},onClose=()=>{}}) {
    const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const view=el('section','home-view');view.id='homeView';view.hidden=true;view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','Control Centre');
    const header=el('header','home-header'),title=el('h1','','Control Centre'),close=el('button','chipbtn','← Room');close.type='button';const controls=el('div','home-header-actions'),settings=el('button','chipbtn','⚙');settings.type='button';settings.setAttribute('aria-label','Settings');settings.onclick=()=>{closeView(false);actions.navigate('settings');};controls.append(settings,close);header.append(title,controls);view.appendChild(header);
    const scroll=el('div','home-scroll'),main=el('main','home-content');scroll.appendChild(main);view.appendChild(scroll);const sections={};
    SECTIONS.forEach(name=>{const section=el('section','home-section'),h=el('h2','',name);h.id='home-'+name.toLowerCase().replaceAll(' ','-');section.setAttribute('aria-labelledby',h.id);section.appendChild(h);main.appendChild(section);sections[name]=section;});
    const appSearch=el('input','home-search');appSearch.type='search';appSearch.placeholder='Find a tool or app';appSearch.setAttribute('aria-label','Find a tool or app');
    const appGrid=el('div','home-apps'),appEmpty=el('p','muted');sections['Tools and apps'].append(el('p','muted','Your tools and apps. Color means the furniture is in this room; gray means it is not placed. Every tool still opens here.'),appSearch,appGrid,appEmpty);
    if(actions.chooseShortcut){const shortcut=el('button','chipbtn home-shortcut','Set room shortcut');shortcut.type='button';shortcut.onclick=()=>{closeView(false);actions.chooseShortcut();};sections['Tools and apps'].insertBefore(shortcut,appSearch);}
    let lastPreviewKey='';
    function updatePreviews(){const key=previewKey();if(key===lastPreviewKey)return;lastPreviewKey=key;const entries=new Map(apps().map(p=>[p.id,p]));for(const b of appGrid.querySelectorAll('[data-app]')){const p=entries.get(b.dataset.app),asset=p&&preview(p);let img=b.querySelector('.home-furniture');if(!asset){img?.remove();b.querySelector('.home-asset-hint')?.remove();continue;}if(!img){img=el('img','home-furniture');img.alt='';img.setAttribute('aria-hidden','true');b.appendChild(img);}if(img.getAttribute('src')!==asset.src)img.src=asset.src;img.classList.toggle('absent',!asset.present);img.dataset.furniture=asset.id;const hint=b.querySelector('.home-asset-hint') || el('small','home-asset-hint muted');hint.textContent=asset.present?'In your room':'Not placed in this room';b.appendChild(hint);}}
    function launchApps(){appGrid.replaceChildren();const q=appSearch.value.trim().toLocaleLowerCase(),rows=apps().filter(p=>(p.label+' '+(p.description || '')).toLocaleLowerCase().includes(q));appEmpty.textContent=rows.length?'':'No matching apps. Try another word.';
      for(const p of rows){const b=el('button','home-app'),icon=el('span','home-app-icon',p.icon),copy=el('span');b.type='button';b.dataset.app=p.id;icon.setAttribute('aria-hidden','true');copy.append(el('b','',p.label),el('small','muted',p.description));b.append(icon,copy);b.onclick=()=>{closeView(false);actions.launch(p);};appGrid.appendChild(b);}
      const add=el('button','home-app');add.type='button';add.textContent='＋ Add your own';add.onclick=()=>{closeView(false);actions.addPortal();};appGrid.appendChild(add);lastPreviewKey=null;updatePreviews();
    }
    appSearch.oninput=launchApps;
    document.body.appendChild(view);
    let active=false,next=0;
    function refresh(){if(active)updatePreviews();}
    function viewport(){if(!active)return;view.style.height=(window.visualViewport?.height || innerHeight)+'px';view.style.top=(window.visualViewport?.offsetTop || 0)+'px';}
    window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);
    function open(){if(active)return;beforeOpen();active=true;view.hidden=false;viewport();scroll.scrollTop=0;appSearch.value='';launchApps();close.focus({preventScroll:true});}
    function closeView(focus=true){if(!active)return;active=false;if(view.contains(document.activeElement))document.activeElement.blur();view.hidden=true;view.style.height='';view.style.top='';if(focus)onClose();}
    close.onclick=()=>closeView();
    window.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();closeView();}else if(e.key==='Tab'){const nodes=[...view.querySelectorAll('button,input,select')].filter(n=>!n.disabled&&n.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(!view.contains(document.activeElement)){e.preventDefault();(e.shiftKey?last:first).focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}e.stopImmediatePropagation();},true);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    return {open,close:closeView,refresh,view,get active(){return active;},tick(time){if(!active||time<next)return;next=time+1000;refresh();updatePreviews();}};
  }
  const api={SECTIONS,MOTION_KEY,PHASES,day,reducedMotion,search,coziness,snapshot,createSearch,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRHome=api;
})(typeof window!=='undefined'?window:globalThis);
