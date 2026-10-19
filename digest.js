// Daily Drift: a private, deterministic weekly paper. Delivery week is the
// current ISO week; its recap covers the previous completed Monday–Sunday.
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
    // Streaks belong to the Daily News front page now; the Drift never repeats them.
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
  function create({store,now=()=>new Date(),sources=()=>({}),magazine=null,arrange=v=>v}){
    const read=()=>{const s=store.get(KEY,{})||{};return {lastIssueWeek:/^\d{4}-W\d{2}$/.test(s.lastIssueWeek)?s.lastIssueWeek:'',issues:rows(s.issues).filter(i=>i&&/^\d{4}-W\d{2}$/.test(i.week)&&Array.isArray(i.sections))};};
    const save=s=>{store.set(KEY,s);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(s))throw Error('Could not keep the Daily Drift on this device.');};
    // The house press adds pet columns, records and gossip once per issue. An issue
    // printed before the press existed gets its magazine pages once, then stays fixed.
    function extend(target,src){if(!magazine||target.press)return false;target.sections=arrange([...target.sections.filter(x=>x.id!=='closing'),...magazine(target,src),...target.sections.filter(x=>x.id==='closing')]);target.press=1;return true;}
    function ensure(){const s=read(),week=isoWeek(delivery(now())),existing=s.issues.find(i=>i.week===week);if(existing){if(magazine&&!existing.press&&extend(existing,sources()))save(s);return copy(existing);}if(s.lastIssueWeek>=week)return copy(s.issues[0]||null);const src=sources(),next=issue(now(),src);extend(next,src);s.issues.unshift(next);s.lastIssueWeek=week;save(s);return copy(next);}
    return {ensure,get issues(){return copy(read().issues);},get latest(){return copy(read().issues[0]||null);},open(week){ensure();const s=read(),found=s.issues.find(i=>i.week===week)||s.issues[0];if(!found)return null;if(!found.read){found.read=true;save(s);}return copy(found);}};
  }
  // Story labels and claps come from the house press when it is present.
  const LABEL={behind:'Behind the week',gossip:'Village gossip',ahead:'The week ahead',memory:'On this day',saga:'Pet column',week:'Week over week',roundup:'Records roundup',closing:'From the editor'};
  function createView({model,sheet,sound,scenes=()=>[],thumb=()=>null,openScene=()=>{},onRead=()=>{},notice=()=>{},press=null}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
    function clapButton(type,label){const b=el('button','press-clap');b.type='button';const count=()=>press.claps(type);const paint=()=>{b.textContent=`👏 ${count()||''}`.trim();b.setAttribute('aria-pressed',String(press.clapped('drift',type)));};b.setAttribute('aria-label',`Clap for ${label.toLowerCase()} stories`);paint();b.onclick=()=>{try{press.clap('drift',type);paint();}catch(e){notice(e.message);}};return b;}
    function open(week){try{model.ensure();const current=model.open(week);if(!current)return;onRead();try{sound.flip();}catch(e){/* optional paper rustle */}sheet('Daily Drift','The Sunday magazine, kept on this device. Nothing leaves your room.',h=>{
      const root=h('div','drift-reader');
      function section(value){const type=value.type||'behind',label=LABEL[type]||'',block=el('section','drift-section'+(type==='saga'?' drift-column':'')+(press&&type!=='closing'&&press.isShrunk(type)?' is-shrunk':''));block.dataset.type=type;if(label&&type!=='closing')block.appendChild(el('p','press-kicker',label));block.append(el('h3','',value.title),el('p','',value.body));
        if(value.sceneId){const scene=scenes().find(s=>s.id===value.sceneId);if(scene){const b=el('button','drift-memory','Open this scene'),src=scene.decor&&thumb({...scene.decor,id:scene.id});b.type='button';if(src){const img=document.createElement('img');img.src=src;img.alt='';b.prepend(img);}b.onclick=()=>openScene(scene);block.appendChild(b);}}
        if(press&&label&&type!=='closing')block.appendChild(clapButton(type,label));return block;}
      function paint(value){root.replaceChildren();const paper=el('article','drift-paper');paper.append(el('p','drift-eyebrow','THE SUNDAY MAGAZINE OF THE HOUSE'),el('h2','drift-masthead','Daily Drift'),el('p','drift-edition',`${value.week} · The week of ${value.from} to ${value.through}`));
        const columns=value.sections.filter(s=>s.type==='saga'),rest=value.sections.filter(s=>s.type!=='saga');
        if(columns.length){const desk=el('section','drift-pets');desk.append(el('h3','drift-desk','The pet columns'));const grid=el('div','drift-pet-grid');for(const c of columns)grid.appendChild(section(c));desk.appendChild(grid);paper.appendChild(desk);}
        const cols=el('div','drift-columns');for(const s of rest)cols.appendChild(section(s));paper.appendChild(cols);root.appendChild(paper);
        if(press&&value.week===model.latest?.week)try{press.seen('drift',value.week,value.sections.map(s=>s.type).filter(t=>t&&t!=='closing'));}catch(e){/* preferences are optional */}
        const past=el('section','drift-archive');past.append(el('h3','','Past issues'));for(const saved of model.issues){const b=el('button','chipbtn',saved.week+(saved.week===value.week?' · reading':''));b.type='button';b.setAttribute('aria-pressed',String(saved.week===value.week));b.onclick=()=>{try{const next=model.open(saved.week);onRead();paint(next);}catch(e){notice(e.message);}};past.appendChild(b);}root.appendChild(past);}
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
