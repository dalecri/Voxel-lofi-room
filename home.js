// Cozy OS Home. Derived device-local data, with navigation delegated to the room's real tools.
(function(root) {
  const SECTIONS=['Control center','Today','Gentle notifications','Search','Coziness status'];
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
  function createView({context,sources,apps=()=>[],actions,beforeOpen=()=>{},onClose=()=>{}}) {
    const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const view=el('section','home-view');view.id='homeView';view.hidden=true;view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','Home');
    const header=el('header','home-header'),title=el('h1','','Home'),close=el('button','chipbtn','← Room');close.type='button';header.append(title,close);view.appendChild(header);
    const scroll=el('div','home-scroll'),main=el('main','home-content');scroll.appendChild(main);view.appendChild(scroll);const sections={};
    SECTIONS.forEach(name=>{const section=el('section','home-section'),h=el('h2','',name);h.id='home-'+name.toLowerCase().replaceAll(' ','-');section.setAttribute('aria-labelledby',h.id);section.appendChild(h);main.appendChild(section);sections[name]=section;});
    const today=sections.Today,date=el('p','home-date'),conditions=el('p','muted'),daily=el('button','d today home-daily'),icon=el('i','','☀'),copy=el('div'),name=el('b'),hint=el('span'),streak=el('p','muted small'),waiting=el('p','muted home-waiting');icon.setAttribute('aria-hidden','true');daily.type='button';copy.append(name,hint);daily.append(icon,copy);today.append(date,conditions,daily,streak,waiting);
    const noticeList=el('div','home-notifications');sections['Gentle notifications'].appendChild(noticeList);
    const appSearch=el('input','home-search');appSearch.type='search';appSearch.placeholder='Find a tool or app';appSearch.setAttribute('aria-label','Find a tool or app');
    const appGrid=el('div','home-apps'),appEmpty=el('p','muted');sections['Control center'].append(el('p','muted','Your everyday tools and apps, right here.'),appSearch,appGrid,appEmpty);
    function launchApps(){appGrid.replaceChildren();const q=appSearch.value.trim().toLocaleLowerCase(),rows=apps().filter(p=>(p.label+' '+(p.description || '')).toLocaleLowerCase().includes(q));appEmpty.textContent=rows.length?'':'No matching apps. Try another word.';
      for(const p of rows){const b=el('button','home-app'),icon=el('span','home-app-icon',p.icon),copy=el('span');b.type='button';b.dataset.app=p.id;icon.setAttribute('aria-hidden','true');copy.append(el('b','',p.label),el('small','muted',p.description));b.append(icon,copy);b.onclick=()=>{closeView(false);actions.launch(p);};appGrid.appendChild(b);}
      const add=el('button','home-app');add.type='button';add.textContent='＋ Add your own';add.onclick=()=>{closeView(false);actions.addPortal();};appGrid.appendChild(add);
    }
    appSearch.oninput=launchApps;
    const input=el('input','home-search');input.type='search';input.placeholder='Search furniture, letters, scenes, ideas.';input.setAttribute('aria-label','Search furniture, letters, scenes, ideas');const results=el('div','home-results');sections.Search.append(input,results);
    const cozy=el('p','home-coziness');sections['Coziness status'].appendChild(cozy);document.body.appendChild(view);
    let active=false,signature='',next=0,lastSources='';
    function navigate(target,item){closeView(false);actions.navigate(target,item);}
    function searchResults(){const source=sources(),sig=JSON.stringify(source);lastSources=sig;results.replaceChildren();const groups=search(input.value,source);
      if(!input.value.trim()||!groups.length){results.appendChild(el('p','muted',input.value.trim()?'No matches yet. Try another word.':'Search furniture, letters, scenes, ideas.'));return;}
      for(const group of groups){const section=el('section','home-result-group');section.appendChild(el('h3','',group.type));for(const item of group.items.slice(0,30)){const b=el('button','home-row',item.title);b.type='button';b.onclick=()=>navigate(group.type,item);section.appendChild(b);}if(group.items.length>30)section.appendChild(el('p','muted small','Keep typing to narrow these results.'));results.appendChild(section);}
    }
    input.oninput=searchResults;
    function refresh(){if(!active)return;const ctx=context(),data=snapshot(ctx);date.textContent=data.today.date;conditions.textContent=`${data.today.phase} · ${data.today.clock} · ${data.today.weather}`;name.textContent=data.today.daily.name;hint.textContent=data.today.daily.D.done?'Done for today. A new moment tomorrow.':data.today.daily.hint;icon.textContent=data.today.daily.D.done?'✓':'☀';streak.textContent=data.today.streak?`${data.today.streak} day streak`:'Start a streak';daily.onclick=()=>navigate('daily');
      waiting.textContent=data.today.waiting.join(' · ');
      const sig=JSON.stringify(data.notifications);if(sig!==signature){signature=sig;noticeList.replaceChildren();if(!data.notifications.length)noticeList.appendChild(el('p','muted','All quiet. The room is humming.'));for(const n of data.notifications){const b=el('button','home-row');b.type='button';b.append(el('b','',n.title),el('span','muted small',n.sub));b.onclick=()=>navigate(n.target);noticeList.appendChild(b);}}
      cozy.textContent=data.coziness.line;
    }
    function viewport(){if(!active)return;view.style.height=(window.visualViewport?.height || innerHeight)+'px';view.style.top=(window.visualViewport?.offsetTop || 0)+'px';}
    window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);
    function open(){if(active)return;beforeOpen();active=true;view.hidden=false;viewport();signature='initial';scroll.scrollTop=0;refresh();searchResults();appSearch.value='';launchApps();close.focus({preventScroll:true});}
    function closeView(focus=true){if(!active)return;active=false;if(view.contains(document.activeElement))document.activeElement.blur();view.hidden=true;view.style.height='';view.style.top='';if(focus)onClose();}
    close.onclick=()=>closeView();
    window.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();closeView();}else if(e.key==='Tab'){const nodes=[...view.querySelectorAll('button,input,select')].filter(n=>!n.disabled&&n.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(!view.contains(document.activeElement)){e.preventDefault();(e.shiftKey?last:first).focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}e.stopImmediatePropagation();},true);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    return {open,close:closeView,refresh,view,get active(){return active;},tick(time){if(!active||time<next)return;next=time+1000;refresh();if(input.value.trim()&&JSON.stringify(sources())!==lastSources)searchResults();}};
  }
  const api={SECTIONS,MOTION_KEY,PHASES,day,reducedMotion,search,coziness,snapshot,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRHome=api;
})(typeof window!=='undefined'?window:globalThis);
