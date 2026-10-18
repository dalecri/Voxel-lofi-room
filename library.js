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
    const closeButton=el('button','library-close','×');closeButton.type='button';closeButton.setAttribute('aria-label','Close library');view.appendChild(closeButton);
    const stage=el('div','library-stage');view.appendChild(stage);document.body.appendChild(view);
    let active=false,cover=true,index=0,rows=[],lastFocus=null,resumeId=null,gesture=null,swiped=false,timer=0,draft='';
    const pageSound=()=>{try{sound.init?.();sound.rustle?.();}catch(e){/* optional audio */}};
    function button(host,label,fn,cls=''){const b=el('button',cls,label);b.type='button';b.onclick=fn;host.appendChild(b);return b;}
    function animate(cls){const book=stage.firstElementChild;if(!book)return;book.classList.remove('library-turn','library-opening');void book.offsetWidth;book.classList.add(cls);clearTimeout(timer);timer=setTimeout(()=>book.classList.remove(cls),350);}
    function showPage(id,opening=false){rows=model.pages();index=Math.max(0,rows.findIndex(p=>p.id===id));cover=false;model.mark(rows[index].id);draw();animate(opening?'library-opening':'library-turn');}
    function turn(delta){if(cover){showPage(model.resume(),true);return;}if(index+delta<0){cover=true;draw();pageSound();return;}if(index+delta>=rows.length)return;showPage(rows[index+delta].id);pageSound();}
    function safe(fn){try{fn();}catch(e){const status=stage.querySelector('[role=status]');if(status)status.textContent=e.message;}}
    function draw(){stage.replaceChildren();view.dataset.page=cover?'cover':rows[index].id;view.classList.toggle('library-reduced',reduced());
      if(cover){const book=el('div','library-cover');book.setAttribute('role','group');book.setAttribute('aria-label','Library book stack');stage.appendChild(book);
        const plaque=el('div','library-plaque');book.appendChild(plaque);const title=button(plaque,model.title,rename,'library-title');title.setAttribute('aria-label','Rename library');
        const stack=el('div','library-stack');stack.setAttribute('aria-hidden','true');for(const [kind,label] of [['letters','LETTERS'],['ideas','SPARKS'],['notes','NOTES']]){const volume=el('div','library-stack-volume '+kind);volume.append(el('span','library-stack-band'),el('span','library-stack-label',label),el('span','library-stack-pages'));stack.appendChild(volume);}book.appendChild(stack);button(book,'Open your library',e=>{e.stopPropagation();showPage(model.resume(),true);pageSound();},'library-cover-hint').setAttribute('aria-label','Open library book');book.onclick=e=>{if(e.target.closest('.library-plaque'))return;showPage(model.resume(),true);pageSound();};
        book.onkeydown=e=>{if(e.target!==book)return;if(['Enter',' '].includes(e.key)){e.preventDefault();showPage(model.resume(),true);pageSound();}};return;
      }
      const book=el('div','library-book');stage.appendChild(book);const left=el('aside','library-left'),right=el('section','library-page');book.append(left,right);
      left.append(el('span','library-smallcaps','A LITTLE LIBRARY'),el('h2','',model.title),el('p','library-quiet','Letters, sparks, and small thoughts. Just yours, on this device.'));
      button(left,'+ New note',()=>safe(()=>showPage('compose')),'library-new').setAttribute('aria-label','New note');button(left,'← Cover',()=>{cover=true;draw();pageSound();},'library-back-cover').setAttribute('aria-label','Book cover');
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
      const nav=el('nav','library-pages');nav.setAttribute('aria-label','Book pages');right.appendChild(nav);button(nav,'‹',()=>safe(()=>turn(-1)),'library-prev').setAttribute('aria-label','Previous page');const counter=el('span','library-counter',`${index+1}/${rows.length}`);counter.setAttribute('aria-live','polite');nav.appendChild(counter);const next=button(nav,'›',()=>safe(()=>turn(1)),'library-next');next.setAttribute('aria-label','Next page');next.disabled=index===rows.length-1;
    }
    function rename(e){e.stopPropagation();const plaque=stage.querySelector('.library-plaque');plaque.replaceChildren();const form=el('form','library-rename'),input=el('input');input.value=model.title;input.maxLength=60;input.required=true;input.setAttribute('aria-label','Library title');const save=el('button','','Save title');save.type='submit';const status=el('p');status.setAttribute('role','status');form.append(input,save,status);form.onsubmit=e=>{e.preventDefault();safe(()=>{model.rename(input.value);draw();stage.querySelector('.library-title').focus();});};plaque.appendChild(form);input.focus();input.select();}
    function open(){if(active)return;lastFocus=document.activeElement;beforeOpen();active=true;cover=true;rows=model.pages();resumeId=model.bookmark;view.hidden=false;viewport();draw();closeButton.focus({preventScroll:true});pageSound();}
    function close(){if(!active)return;active=false;view.hidden=true;clearTimeout(timer);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
    function viewport(){view.style.height=(window.visualViewport?.height || innerHeight)+'px';view.style.top=(window.visualViewport?.offsetTop || 0)+'px';}
    closeButton.onclick=close;
    stage.addEventListener('pointerdown',e=>{swiped=false;gesture=null;if(e.target.closest('button,input,textarea'))return;gesture=[e.clientX,e.clientY];});
    stage.addEventListener('pointerup',e=>{if(!gesture)return;const dx=e.clientX-gesture[0],dy=e.clientY-gesture[1];gesture=null;const bounds=stage.firstElementChild.getBoundingClientRect();if(Math.abs(dx)<6&&Math.abs(dy)<6&&!cover&&!e.target.closest('button,input,textarea')&&(e.clientX<bounds.left+12||e.clientX>bounds.right-12)){safe(()=>turn(e.clientX<bounds.left+12?-1:1));return;}if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){swiped=true;safe(()=>turn(dx<0?1:-1));}});
    stage.addEventListener('pointercancel',()=>{gesture=null;});stage.addEventListener('click',e=>{if(swiped){e.stopImmediatePropagation();e.preventDefault();swiped=false;}},true);
    window.addEventListener('keydown',e=>{if(!active)return;const typing=e.target.matches('input,textarea');if(e.key==='Escape'){e.preventDefault();close();}else if(!typing&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();safe(()=>turn(e.key==='ArrowRight'?1:-1));}else if(e.key==='Tab'){const nodes=[...view.querySelectorAll('button,input,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||!view.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!view.contains(document.activeElement))){e.preventDefault();first?.focus();}}e.stopImmediatePropagation();},true);
    window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
    return {open,close,model,view,get active(){return active;}};
  }
  const api={KEY,day,create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRLibrary=api;
})(typeof window!=='undefined'?window:globalThis);
