// Daily Brief: a private, deterministic paper delivered to the door each morning.
// Sunday's brief also carries the weekly pages: the recap of Monday to Sunday,
// pet columns and records. issue() builds those weekly pages.
(function(root){
  const Calendar=typeof module!=='undefined'&&module.exports?require('./calendar.js'):root.LRCalendar;
  const KEY='lr.digest',DAY=86400000,day=Calendar.day,rows=v=>Array.isArray(v)?v:[],copy=v=>JSON.parse(JSON.stringify(v)),clip=(v,n=180)=>String(v??'').slice(0,n);
  function isoWeek(now){const d=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear(),week=Math.ceil(((d-Date.UTC(year,0,1))/DAY+1)/7);return `${year}-W${String(week).padStart(2,'0')}`;}
  function period(now){const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);monday.setDate(monday.getDate()-((monday.getDay()+6)%7));const start=new Date(monday),end=new Date(monday);start.setDate(start.getDate()-7);end.setDate(end.getDate()-1);return {from:day(start),through:day(end)};}
  // The Drift is a Sunday magazine: on Sunday the coming ISO week's issue is out,
  // recapping the Monday-to-Sunday week that ends today.
  function delivery(now){return now.getDay()===0?new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,12):now;}
  function dated(value){if(Calendar.valid(value))return value;const d=new Date(value);return Number.isFinite(+d)?day(d):'';}
  function issue(now,sources={}){
    sources=sources||{};
    const at=delivery(now),week=isoWeek(at),date=day(now),{from,through}=period(at),within=v=>{const d=dated(v);return d&&d>=from&&d<=through;},counts={};
    for(const row of rows(sources.activity))if(within(row?.date))for(const event of rows(row.events))if(typeof event==='string')counts[event]=(counts[event]||0)+1;
    const ideas=rows(sources.ideas).filter(i=>i&&within(i.createdAt)).length;counts.idea=Math.max(ideas,(counts.idea||0)+(counts.ideas||0));
    const TYPES={week:'behind',generosity:'behind',scenes:'behind',visitors:'gossip',gossip:'gossip',ahead:'ahead',memory:'memory',closing:'closing'};
    const sections=[],add=(id,title,body,extra={})=>sections.push({id,type:TYPES[id],title,body,...extra}),pieces=[];
    for(const [kind,singular,plural] of [['focus','focus pause','focus pauses'],['tea','tea brew','tea brews'],['letter','letter','letters'],['idea','idea kept','ideas kept'],['pushups','pushup milestone','pushup milestones']]){const n=kind==='pushups'?(counts.pushups||0)+(counts.tally||0):counts[kind]||0;if(n)pieces.push(`${n} ${n===1?singular:plural}`);}
    add('week','Little things, kept',pieces.length?`The week left a few footprints: ${pieces.join(' · ')}. Small things made a home here.`:'The room had a quiet week. There is nothing to catch up on. A little breathing room counts, too.');
    if(counts.tip)add('generosity','A little generosity',`Mallow received ${counts.tip} kind tip${counts.tip===1?'':'s'} this week. A small spin was observed. The satchel remains strictly his business.`);
    const scenes=rows(sources.scenes).filter(s=>s&&within(s.createdAt)).sort((a,b)=>b.createdAt-a.createdAt||String(a.id).localeCompare(String(b.id)));
    if(scenes.length)add('scenes','Rooms worth remembering',`${scenes.length} scene${scenes.length===1?' was':'s were'} tucked away: ${scenes.slice(0,3).map(s=>clip(s.title||'An untitled scene',80)).join(' · ')}. A little light, kept for later.`,{sceneId:scenes[0].id});
    // Streaks are daily brief stories; the weekly pages never repeat them.
    const notes=rows(sources.guestbook).filter(n=>n&&within(n.d)).sort((a,b)=>String(b.d).localeCompare(String(a.d))||String(a.n).localeCompare(String(b.n)));
    if(notes.length)add('visitors','Post from the doorstep',notes.slice(0,3).map(n=>`${clip(n.n||'A friend',40)} ${n.t?`left a note: “${clip(n.t,160)}”`:'left a little sticker'}.`).join(' '));
    // Current main has cat diary observations but no persisted companion log.
    // Accept a future supplied log without inventing a storage key or sightings.
    const observations=[...rows(sources.companionLog),...rows(sources.catLog)].filter(e=>e&&within(e.time)).sort((a,b)=>b.time-a.time||String(a.name).localeCompare(String(b.name))),seen=observations[0];
    if(seen){const d=new Date(seen.time),h=d.getHours(),time=`${h%12||12}${d.getMinutes()?':'+String(d.getMinutes()).padStart(2,'0'):''}${h<12?'am':'pm'}`,act={read:'supervising the bookshelf',type:'holding a meeting with the keyboard',sleep:'conducting an extended sleep study',nap:'testing the structural limits of a nap',sunbeam:'occupying a strategically important sunbeam',rain:'monitoring the weather from a dry position',mischief:'reviewing the laws of gravity',pet:'accepting tribute',merchant:'inspecting the local economy'}[seen.activity||seen.kind]||'supervising the room';add('gossip','Field notes from the habitat',`${clip(seen.name||'The resident',60)} was spotted ${act} at ${time}. No statement has been issued. The investigation will resume after a nap.`);}
    else add('gossip','Field notes from the habitat','The resident fauna supplied no statement this week. Observers recommend leaving the sunbeam undisturbed. Research continues, very slowly.');
    const later=new Date(now.getFullYear(),now.getMonth(),now.getDate()+7,12),ahead=[...rows(sources.countdowns),...rows(sources.events)].filter(e=>e&&Calendar.valid(e.date)&&e.date>=date&&e.date<=day(later)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.title).localeCompare(String(b.title)));
    if(ahead.length)add('ahead','A small thing on the horizon',ahead.slice(0,3).map(e=>`${e.date} · ${clip(e.title||'A date to keep',100)}`).join('\n'));
    const memory=Calendar.memoryFor(rows(sources.scenes),date);if(memory)add('memory','On this day, another year',`${new Date(memory.createdAt).getFullYear()} · ${clip(memory.title||'A room memory',100)}. The light looked a little different then.`,{sceneId:memory.id});
    add('closing','From the editor','Fold this week gently. There is room for whatever comes next.');return {week,date,from,through,sections,read:false};
  }
  // One brief per local day, kept immutable once delivered. Older weekly issues
  // (from before the brief) stay readable in the archive.
  function create({store,now=()=>new Date(),sources=()=>({}),brief=null,magazine=null,arrange=v=>v,keep=60}){
    const read=()=>{const s=store.get(KEY,{})||{};return {lastDate:Calendar.valid(s.lastDate)?s.lastDate:'',issues:rows(s.issues).filter(i=>i&&Calendar.valid(i.date)&&Array.isArray(i.sections))};};
    const save=s=>{const keepS={lastDate:s.lastDate,issues:s.issues.slice(0,keep)};store.set(KEY,keepS);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(keepS))throw Error('Could not keep the Daily Brief on this device.');};
    const isBrief=i=>i.brief===1;
    function build(at,src){
      const date=day(at),daily=brief?brief(src):{slim:true,sections:[]},sunday=at.getDay()===0,s=read();
      let sections=[...daily.sections],week=isoWeek(at),from='',through='';
      if(sunday){const recap=issue(at,src);week=recap.week;from=recap.from;through=recap.through;
        const pages=[...(magazine?magazine({week,from,through,date},src):[]),...recap.sections.filter(x=>x.id!=='closing')];
        sections=[...sections,...arrange(pages),...recap.sections.filter(x=>x.id==='closing')];}
      return {brief:1,date,week,from,through,sunday,slim:!!daily.slim&&!sunday,no:s.issues.filter(isBrief).length+1,sections,read:false};
    }
    function ensure(){const s=read(),date=day(now()),existing=s.issues.find(i=>isBrief(i)&&i.date===date);if(existing)return copy(existing);if(s.lastDate>date)return copy(s.issues[0]||null);
      const next=build(now(),sources());s.issues.unshift(next);s.lastDate=date;save(s);return copy(next);}
    return {ensure,get issues(){return copy(read().issues);},get latest(){return copy(read().issues[0]||null);},
      open(key){ensure();const s=read(),found=s.issues.find(i=>(i.brief?i.date:i.week)===key)||s.issues[0];if(!found)return null;if(!found.read){found.read=true;save(s);}return copy(found);}};
  }
  // Story labels and claps come from the house press when it is present.
  const LABEL={lane:'On the lane',behind:'Behind the week',gossip:'Village gossip',ahead:'The week ahead',memory:'On this day',saga:'Pet column',week:'Week over week',roundup:'Records roundup',closing:'From the editor',streak:'On a roll',first:'A first',record:'House record',drought:'Gone quiet',diary:'From the diary',forecast:'Today in the house'};
  const keyOf=i=>i.brief?i.date:i.week;
  function createView({model,sheet,sound,scenes=()=>[],thumb=()=>null,openScene=()=>{},onRead=()=>{},notice=()=>{},press=null}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
    function clapButton(type,label){const b=el('button','press-clap');b.type='button';const paint=()=>{b.textContent=`👏 ${press.claps(type)||''}`.trim();b.setAttribute('aria-pressed',String(press.clapped('brief',type)));};b.setAttribute('aria-label',`Clap for ${label.toLowerCase()} stories`);paint();b.onclick=()=>{try{press.clap('brief',type);paint();}catch(e){notice(e.message);}};return b;}
    const longDate=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    const shortDate=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
    const md=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const svg=(path,size=20)=>`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    function chipLabel(saved,today){if(!saved.brief)return saved.week;const yesterday=day(new Date(new Date(today+'T12:00').getTime()-DAY));return saved.date===today?`Today • ${md(saved.date)}`:saved.date===yesterday?`Yesterday • ${md(saved.date)}`:md(saved.date);}
    function open(key){try{model.ensure();const current=model.open(key);if(!current)return;onRead();try{sound.flip();}catch(e){/* optional paper rustle */}sheet('Daily brief','',h=>{
      const root=h('div','drift-reader'),host=root.closest('#sheetBody'),title=host?.querySelector(':scope > h2'),closeButton=host?.querySelector('.sheet-close');
      let showAll=false;
      if(title&&closeButton){const header=el('div','brief-heading');header.dataset.controlHeader='true';title.before(header);header.append(title,closeButton);
        if(!header.querySelector('.control-back')){const back=el('button','chipbtn sheet-icon control-back brief-back');back.type='button';back.setAttribute('aria-label','Back');back.innerHTML=svg('<path d="M19 12H5m6-6-6 6 6 6"/>');back.onclick=()=>closeButton.click();header.prepend(back);}
      }
      function section(value){const type=value.type||'behind',label=LABEL[type]||'',cls='drift-section brief-card'+(type==='saga'?' drift-column':'')+(value.lead?' brief-lead':'')+(type==='forecast'?' brief-today':'')+(press&&type!=='closing'&&!value.lead&&press.isShrunk(type)?' is-shrunk':'');
        const block=el('section',cls);block.dataset.type=type;
        if(label&&type!=='closing'){const k=el('div','brief-kicker');k.appendChild(el('p','press-kicker',label));if(type==='forecast'){const icon=el('span','brief-kicker-icon','🏠');icon.setAttribute('aria-hidden','true');k.appendChild(icon);}block.appendChild(k);}
        if(type!=='forecast')block.appendChild(el('h3','',value.title));if(value.body)block.appendChild(el('p',type==='forecast'?'brief-today-line':'brief-body',value.body));
        const foot=el('div','brief-card-foot');
        if(Array.isArray(value.items)&&value.items.length){const list=el('ul','brief-items');for(const it of value.items){const li=el('li');li.append(el('b','',it.label),el('span','',it.value));list.appendChild(li);}foot.appendChild(list);}
        if(value.sceneId){const scene=scenes().find(s=>s.id===value.sceneId);if(scene){const b=el('button','drift-memory','Open this scene'),src=scene.decor&&thumb({...scene.decor,id:scene.id});b.type='button';if(src){const img=document.createElement('img');img.src=src;img.alt='';b.prepend(img);}b.onclick=()=>openScene(scene);foot.appendChild(b);}}
        if(press&&label&&type!=='closing')foot.appendChild(clapButton(type,label));if(foot.children.length)block.appendChild(foot);return block;}
      function paint(value){root.__value=value;root.replaceChildren();const paper=el('article','drift-paper brief-paper'+(value.slim?' is-slim':''));paper.setAttribute('aria-label','Daily Brief');
        // Masthead: issue number, the name, the date. Nothing else competes with the stories.
        paper.append(el('p','drift-eyebrow',value.brief?`No. ${value.no}`:'Weekly archive'),el('h2','drift-masthead','Daily Brief'),el('p','drift-edition',value.brief?`${longDate(value.date)}${value.sunday?' · Sunday edition':''}`:`${value.week} · The week of ${value.from} to ${value.through}`));
        const daily=new Set(['streak','first','record','drought','diary','forecast']),front=value.sections.filter(s=>value.brief&&daily.has(s.type)),columns=value.sections.filter(s=>s.type==='saga'),rest=value.sections.filter(s=>!front.includes(s)&&s.type!=='saga');
        if(value.slim)paper.appendChild(el('p','brief-slim','“A quiet night in the house. A slim brief today.”'));
        const lead=front.find(s=>s.lead),today=front.find(s=>s.type==='forecast');if(lead)paper.appendChild(section(lead));if(today)paper.appendChild(section(today));
        const others=front.filter(s=>s!==lead&&s!==today);if(others.length){const cols=el('div','drift-columns');for(const s of others)cols.appendChild(section(s));paper.appendChild(cols);}
        if(columns.length){const desk=el('section','drift-pets');desk.append(el('h3','drift-desk','The pet columns'));const grid=el('div','drift-pet-grid');for(const c of columns)grid.appendChild(section(c));desk.appendChild(grid);paper.appendChild(desk);}
        if(rest.length){if(value.sunday)paper.appendChild(el('h3','brief-weekly','The week, folded'));const cols=el('div','drift-columns');for(const s of rest)cols.appendChild(section(s));paper.appendChild(cols);}
        root.appendChild(paper);
        if(press&&keyOf(value)===keyOf(model.latest||{}))try{press.seen('brief',keyOf(value),value.sections.map(s=>s.type).filter(t=>t&&t!=='closing'));}catch(e){/* preferences are optional */}
        const past=el('section','brief-past'),pastHead=el('div','brief-past-head'),viewAll=el('button','brief-viewall',showAll?'Less':'All');viewAll.type='button';viewAll.setAttribute('aria-expanded',String(showAll));viewAll.onclick=()=>{showAll=!showAll;paint(value);};
        pastHead.append(el('h3','','Past briefs'),viewAll);const chips=el('div','drift-archive'+(showAll?' is-all':''));const today2=day(new Date());
        for(const saved of model.issues.slice(0,showAll?60:14)){const on=keyOf(saved)===keyOf(value),b=el('button','brief-chip');b.type='button';b.setAttribute('aria-label',chipLabel(saved,today2)+(saved.brief?`, No. ${saved.no}`:''));
          // Day pills, like the week strip on Today: weekday over the date number.
          if(saved.brief){const d=new Date(saved.date+'T12:00');b.append(el('small','',saved.date===today2?'Today':d.toLocaleDateString(undefined,{weekday:'short'})),el('b','',String(d.getDate())));}else b.append(el('small','','Week'),el('b','',String(saved.week).replace(/^.*W/,'')));b.setAttribute('aria-pressed',String(on));b.onclick=()=>{try{const next=model.open(keyOf(saved));onRead();paint(next);}catch(e){notice(e.message);}};chips.appendChild(b);}
        past.append(pastHead,chips);root.appendChild(past);}
      paint(current);
    });}catch(e){notice(e.message);}}
    return {open};
  }
  const PAPER={kind:'floor',size:[2,1],vars:[[]],build(m){m.box(0,0,0,16,1,8,0xa67b50).box(1,0,1,15,1,7,0xc39a66).box(3,1,1,14,2,7,0xf6e9cc).box(4,2,2,13,3,3,0x645749);for(let z=4;z<7;z++)m.box(4,2,z,9,3,z+1,0xb4a68c);m.box(10,2,4,13,3,6,0xd0af77);}};
  function createPaper({view,room,model,open,hidden=()=>false,notice=()=>{}}){
    const object=view.makeObject({t:'daily-drift-paper',id:'daily-drift-paper',c:0},null,true,PAPER);object.visible=false;view.root.add(object);let checked='',signature='';
    function update(){const date=day(new Date());if(checked!==date){checked=date;try{model.ensure();}catch(e){notice(e.message);}}const latest=model.latest,visible=!!latest&&!latest.read&&!hidden();const key=JSON.stringify([visible,room.n,room.items.map(i=>[i.id,i.t,i.x,i.z,i.p,i.r])]);if(signature===key)return;signature=key;object.visible=visible;if(visible){const n=room.n,spots=[];for(let x=Math.max(0,Math.floor(n/2)-1);x<n-1;x++)spots.push([x,n-1]);for(let x=0;x<Math.floor(n/2)-1;x++)spots.push([x,n-1]);const [x,z]=spots.find(([x,z])=>view.cellFree(x,z)&&view.cellFree(x+1,z))||[Math.max(0,n/2-1),n-.05];object.position.set(x+1,.015,z+.5);object.updateWorldMatrix(true,true);}view.activity?.wake();}
    function hit(x,y){if(!object.visible||hidden())return false;view.ray(x,y);object.updateWorldMatrix(true,true);const hits=view.raycaster.intersectObjects(object.userData.meshes,false),item=view.pickItem(x,y),wall=view.pickWall(x,y);return !!hits.length&&(!item||hits[0].distance<item.dist)&&(!wall||hits[0].distance<=wall.t+.05);}
    return {object,update,hit,open(){if(!object.visible)return;open();update();}};
  }
  const api={KEY,isoWeek,period,delivery,issue,create,createView,createPaper,PAPER};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRDigest=api;
})(typeof window!=='undefined'?window:globalThis);
