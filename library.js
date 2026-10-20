// A device-private reading library. Source letters/ideas stay in their own models;
// only the cover title, quick notes, and a stable page bookmark live in lr.library.
(function(root){
  const KEY='lr.library',day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function create({store,letters=()=>[],ideas=()=>[],now=()=>new Date()}){
    const old=store.get(KEY,{}) || {};
    let state={title:String(old.title || 'My Library').slice(0,60),next:Number.isSafeInteger(old.next)&&old.next>0?old.next:1,
      bookmark:typeof old.bookmark==='string'?old.bookmark:null,notes:Array.isArray(old.notes)?old.notes.filter(n=>n&&typeof n.id==='string'&&typeof n.text==='string').map(n=>({id:n.id,text:n.text,createdAt:Number(n.createdAt)||0})):[]};
    const save=next=>{store.set(KEY,next);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(next))throw Error('Could not save on this device.');state=next;};
    function entries(){return [
      ...letters().map(l=>({id:'letter:'+l.id,kind:'LETTER',title:String(l.title || 'Untitled letter'),text:String(l.body || ''),letterhead:String(l.letterhead || ''),createdAt:Number(l.createdAt)||0})),
      ...ideas().map(i=>({id:'idea:'+i.id,kind:'IDEA',title:'A spark from the jar',text:String(i.text || ''),createdAt:Number(i.createdAt)||0})),
      ...state.notes.map(n=>({...n,id:'note:'+n.id,kind:'NOTE',title:'A little note'}))
    ].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));}
    function pages(){const all=entries(),today=now(),date=day(today),memory=all.find(e=>e.kind==='NOTE'&&new Date(e.createdAt).getFullYear()===today.getFullYear()-1&&day(new Date(e.createdAt)).slice(5)===date.slice(5));
      return [{id:'compose',kind:'COMPOSE'},...(memory?[{...memory,id:'memory:'+memory.id,memory:true}]:[]),...all];}
    return {entries,pages,get title(){return state.title;},get bookmark(){return state.bookmark;},
      resume(){const rows=pages();return rows.some(p=>p.id===state.bookmark)?state.bookmark:rows[0].id;},
      mark(id){if(id!=='compose'&&id!==state.bookmark&&pages().some(e=>e.id===id))save({...state,bookmark:id});},
      rename(title){title=String(title).trim().slice(0,60);if(!title)throw Error('Give your library a little name.');save({...state,title});},
      addNote(text){text=String(text).trim().slice(0,10000);if(!text)throw Error('Write a little something first.');const note={id:'quick-'+now().getTime().toString(36)+'-'+state.next,text,createdAt:now().getTime()};save({...state,next:state.next+1,bookmark:'note:'+note.id,notes:[note,...state.notes]});return {...note};}
    };
  }
  function createView({model,sound,clean,beforeOpen=()=>{},reduced=()=>false}){
    const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const view=el('section','library-view');view.id='libraryView';view.hidden=true;view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','Private library');
    const closeButton=el('button','library-close','×');closeButton.type='button';closeButton.setAttribute('aria-label','Close library');const heading=el('div','app-sheet-heading library-heading');heading.dataset.controlHeader='true';heading.append(el('h2','','My Library'),closeButton);view.appendChild(heading);
    const stage=el('div','library-stage');view.appendChild(stage);document.body.appendChild(view);
    let active=false,cover=true,index=0,rows=[],lastFocus=null,resumeId=null,gesture=null,swiped=false,timer=0,draft='',folder='all';
    const folders=[['all','All files'],['letters','Letters'],['ideas','Sparks'],['notes','Notes'],['new','New note']];
    const folderPages=()=>model.pages().filter(p=>folder==='all'||folder==='new'||({letters:'LETTER',ideas:'IDEA',notes:'NOTE'}[folder]===p.kind)||(folder==='notes'&&p.kind==='COMPOSE'));
    function selectFolder(id,open=false){folder=id;if(open||id==='new'){if(id==='new'){folder='all';showPage('compose',true);}else{const pages=folderPages();if(pages.length)showPage(pages.some(p=>p.id===model.resume())?model.resume():pages[0].id,true);}pageSound();return;}draw();stage.querySelector(`[data-folder-button="${id}"]`)?.focus({preventScroll:true});}
    const pageSound=()=>{try{sound.init?.();sound.rustle?.();}catch(e){/* optional audio */}};
    function button(host,label,fn,cls=''){const b=el('button',cls,label);b.type='button';b.onclick=fn;host.appendChild(b);return b;}
    function animate(cls){const book=stage.firstElementChild;if(!book)return;book.classList.remove('library-turn','library-opening');void book.offsetWidth;book.classList.add(cls);clearTimeout(timer);timer=setTimeout(()=>book.classList.remove(cls),350);}
    function showPage(id,opening=false){rows=folderPages();if(!rows.some(p=>p.id===id)){folder='all';rows=folderPages();}index=Math.max(0,rows.findIndex(p=>p.id===id));cover=false;model.mark(rows[index].id);draw();animate(opening?'library-opening':'library-turn');stage.querySelector('.library-page-content')?.focus({preventScroll:true});}
    function turn(delta){if(cover){selectFolder(folder,true);return;}if(index+delta<0){cover=true;draw();pageSound();return;}if(index+delta>=rows.length)return;showPage(rows[index+delta].id);pageSound();}
    function safe(fn){try{fn();}catch(e){const status=stage.querySelector('[role=status]');if(status)status.textContent=e.message;}}
    function draw(){stage.replaceChildren();view.dataset.page=cover?'cover':rows[index].id;view.dataset.folder=folder;view.classList.toggle('library-reduced',reduced());
      if(cover){const book=el('div','library-cover');book.setAttribute('role','group');book.setAttribute('aria-label','Library archive folders');stage.appendChild(book);
        const plaque=el('div','library-plaque');book.appendChild(plaque);const title=button(plaque,model.title,rename,'library-title');title.setAttribute('aria-label','Rename library');
        const art=el('div','library-archive-art');art.setAttribute('aria-hidden','true');
        const shapes=[['all',225,93,85,100,25,30,15],['letters',195,105,90,100,25,35,15],['ideas',140,90,105,120,5,55,20],['notes',125,105,80,100,5,45,15],['new',112,115,65,100,5,35,15]];
        const paths=shapes.map(([id,x,y,w,h,offset,tw,th])=>{const tx=x+offset,r=4;return `<g class="library-folder${folder===id?' active':''}" data-folder="${id}"><path d="M${x} ${y+h}V${y+r}Q${x} ${y} ${x+r} ${y}H${tx}L${tx+4} ${y-th+r}Q${tx+4} ${y-th} ${tx+4+r} ${y-th}H${tx+tw-4-r}Q${tx+tw-4} ${y-th} ${tx+tw-4} ${y-th+r}L${tx+tw} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h}Z"/></g>`;}).join('');
        art.innerHTML=`<svg viewBox="65 30 285 255" focusable="false"><polygon class="library-box-shadow" points="135,235 240,255 330,205 220,185"/><polygon class="library-box-back" points="110,160 230,180 310,125 190,105"/>${paths}<polygon class="library-box-side" points="230,180 230,250 310,195 310,125"/><polygon class="library-box-front" points="110,160 110,230 230,250 230,180"/><path class="library-box-handle" d="M155 200L180 204Q184 205 184 209Q184 214 180 213L155 209Q151 208 151 204Q151 199 155 200Z"/></svg>`;
        art.onclick=e=>{const f=e.target.closest('[data-folder]');if(f)selectFolder(f.dataset.folder,folder===f.dataset.folder);};book.appendChild(art);
        const tabs=el('nav','library-folders');tabs.setAttribute('aria-label','Library folders');book.appendChild(tabs);
        for(const [id,label] of folders){const count=id==='new'?null:model.entries().filter(p=>id==='all'||p.kind===({letters:'LETTER',ideas:'IDEA',notes:'NOTE'}[id])).length;const b=button(tabs,label+(count===null?'':' · '+count),()=>selectFolder(id,folder===id),'library-folder-button');b.dataset.folderButton=id;b.setAttribute('aria-pressed',String(folder===id));}
        const selected=folders.find(f=>f[0]===folder)[1],open=button(book,'Open '+selected.toLowerCase(),()=>selectFolder(folder,true),'library-cover-hint');open.setAttribute('aria-label','Open folder');open.disabled=!folderPages().length;
        const status=el('p','library-folder-status',open.disabled?'Nothing filed here yet.':'');status.setAttribute('role','status');book.appendChild(status);return;
      }
      const book=el('div','library-book');stage.appendChild(book);const left=el('aside','library-left'),right=el('section','library-page');book.append(left,right);
      left.append(el('span','library-smallcaps','ARCHIVED FILES'),el('h2','',model.title));
      button(left,'+ New note',()=>safe(()=>{folder='all';showPage('compose');}),'library-new').setAttribute('aria-label','New note');button(left,'← Folders',()=>{cover=true;draw();pageSound();stage.querySelector(`[data-folder-button="${folder}"]`)?.focus({preventScroll:true});},'library-back-cover').setAttribute('aria-label','Library folders');
      const p=rows[index],content=el('article','library-page-content');right.appendChild(content);content.tabIndex=0;content.setAttribute('aria-label',p.kind==='COMPOSE'?'New quick note':'Library page');
      const status=el('p','library-status');status.setAttribute('role','status');
      if(p.kind==='COMPOSE'){
        content.append(el('span','library-smallcaps','NOTE'),el('h2','','A little thought'));
        const form=el('form','library-note-form'),input=el('textarea');input.setAttribute('aria-label','Quick note');input.placeholder='Something worth keeping…';input.maxLength=10000;input.value=draft;input.oninput=()=>{draft=input.value;};form.appendChild(input);
        const save=el('button','library-save','Keep this note');save.type='submit';form.append(save,status);form.onsubmit=e=>{e.preventDefault();safe(()=>{const n=model.addNote(input.value);draft='';showPage('note:'+n.id);pageSound();});};content.appendChild(form);
      }else{
        const date=new Date(p.createdAt).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});content.appendChild(el('span','library-smallcaps',p.kind+' · '+date));
        if(p.memory)content.appendChild(el('p','library-memory','✿ A year ago today'));
        if(resumeId===p.id)content.appendChild(el('span','library-ribbon','Pick up where you left off'));
        content.appendChild(el('h2','',p.title));if(p.letterhead)content.appendChild(el('p','library-letterhead',p.letterhead));const text=el('div','library-entry');
        if(p.kind==='LETTER')text.innerHTML=clean(p.text);else text.textContent=p.text;content.append(text,status);
      }
      const nav=el('nav','library-pages');nav.setAttribute('aria-label','Filed pages');right.appendChild(nav);button(nav,'‹',()=>safe(()=>turn(-1)),'library-prev').setAttribute('aria-label','Previous page');const counter=el('span','library-counter',`${index+1}/${rows.length}`);counter.setAttribute('aria-live','polite');nav.appendChild(counter);const next=button(nav,'›',()=>safe(()=>turn(1)),'library-next');next.setAttribute('aria-label','Next page');next.disabled=index===rows.length-1;
    }
    function rename(e){e.stopPropagation();const plaque=stage.querySelector('.library-plaque');plaque.replaceChildren();const form=el('form','library-rename'),input=el('input');input.value=model.title;input.maxLength=60;input.required=true;input.setAttribute('aria-label','Library title');const save=el('button','','Save title');save.type='submit';const status=el('p');status.setAttribute('role','status');form.append(input,save,status);form.onsubmit=e=>{e.preventDefault();safe(()=>{model.rename(input.value);draw();stage.querySelector('.library-title').focus();});};plaque.appendChild(form);input.focus();input.select();}
    function open(){if(active)return;lastFocus=document.activeElement;beforeOpen();active=true;cover=true;folder='all';rows=model.pages();resumeId=model.bookmark;view.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>view.classList.add('is-open')));viewport();draw();closeButton.focus({preventScroll:true});pageSound();}
    function close(){if(!active)return;active=false;view.classList.remove('is-open');view.hidden=true;clearTimeout(timer);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
    // The docked sheet stays above the on-screen keyboard and inside the visible viewport.
    function viewport(){const vv=window.visualViewport,h=vv?.height || innerHeight,top=vv?.offsetTop || 0;view.style.maxHeight=Math.max(240,h-12)+'px';view.style.bottom=Math.max(0,innerHeight-(h+top))+'px';}
    closeButton.onclick=close;
    stage.addEventListener('pointerdown',e=>{swiped=false;gesture=null;if(e.target.closest('button,input,textarea'))return;gesture=[e.clientX,e.clientY];});
    stage.addEventListener('pointerup',e=>{if(!gesture)return;const dx=e.clientX-gesture[0],dy=e.clientY-gesture[1];gesture=null;const bounds=stage.firstElementChild.getBoundingClientRect();if(Math.abs(dx)<6&&Math.abs(dy)<6&&!cover&&!e.target.closest('button,input,textarea')&&(e.clientX<bounds.left+12||e.clientX>bounds.right-12)){safe(()=>turn(e.clientX<bounds.left+12?-1:1));return;}if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){swiped=true;safe(()=>turn(dx<0?1:-1));}});
    stage.addEventListener('pointercancel',()=>{gesture=null;});stage.addEventListener('click',e=>{if(swiped){e.stopImmediatePropagation();e.preventDefault();swiped=false;}},true);
    window.addEventListener('keydown',e=>{if(!active)return;const typing=e.target.matches('input,textarea');if(e.key==='Escape'){e.preventDefault();close();}else if(!typing&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(cover){const ids=folders.filter(f=>f[0]!=='new').map(f=>f[0]),i=ids.indexOf(folder);selectFolder(ids[(i+(e.key==='ArrowRight'?1:ids.length-1))%ids.length]);}else safe(()=>turn(e.key==='ArrowRight'?1:-1));}else if(e.key==='Tab'){const nodes=[...view.querySelectorAll('button,input,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||!view.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!view.contains(document.activeElement))){e.preventDefault();first?.focus();}}e.stopImmediatePropagation();},true);
    window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
    return {open,close,model,view,get active(){return active;}};
  }
  const api={KEY,day,create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRLibrary=api;
})(typeof window!=='undefined'?window:globalThis);
