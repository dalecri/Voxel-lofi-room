// Notetaker: a private stack of notes (stored as lr.letters for older saves). No room data, remote services or shared-code fields.
(function (root) {
  const Postcard=typeof module!=='undefined'&&module.exports?require('./mail-window.js'):root.LRMailWindow;
  const KEY = 'lr.letters';
  // Pictures live inside the note as small data URLs; never a remote address.
  const PHOTO=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  // When Send to future should deliver, chosen on the letter itself.
  const DELIVER = {tomorrow:['Tomorrow',d=>d.setDate(d.getDate()+1)],week:['In 1 week',d=>d.setDate(d.getDate()+7)],month:['In 1 month',d=>d.setMonth(d.getMonth()+1)],year:['In 1 year',d=>d.setFullYear(d.getFullYear()+1)]};
  const deliverDate = (key,from=new Date()) => {const d=new Date(from.getFullYear(),from.getMonth(),from.getDate(),12);(DELIVER[key]||DELIVER.month)[1](d);return day(d);};
  const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const cardDate = date => `${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}.${date.getFullYear()}`;
  const dateStamp = date => date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  // Parse in an inert template, never a live document. Only inline photo data survives; nothing can fetch.
  function sanitizeHTML(html) {
    const template = document.createElement('template'); template.innerHTML = String(html || '');
    const forbidden = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','TEMPLATE','NOSCRIPT']);
    function walk(node, depth = 0) {
      if (node.nodeType === 3) return escapeHTML(node.textContent);
      if (node.nodeType !== 1 && node.nodeType !== 11) return '';
      if (forbidden.has(node.nodeName)) return '';
      if (depth > 60) return escapeHTML(node.textContent);
      let content = [...node.childNodes].map(n => walk(n,depth+1)).join('');
      const tag = node.nodeName.toLowerCase();
      if (tag === 'br') return '<br>';
      if (['b','strong','i','em','u','p','div'].includes(tag)) return `<${tag}>${content}</${tag}>`;
      if (tag === 'ul' || tag === 'ol') return `<ul>${content}</ul>`;
      if (tag === 'li') return node.getAttribute('data-checked') === 'true' ? `<li data-checked="true">${content}</li>` : `<li>${content}</li>`;
      if (tag === 'img') { const src = node.getAttribute('src') || ''; return PHOTO.test(src) && src.length < 2000000 ? `<img src="${src}" alt="Photo">` : ''; }
      // Browser/clipboard spans sometimes encode the same three supported formats as CSS.
      if (tag === 'span') {
        const style = node.style;
        if (style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) content = `<b>${content}</b>`;
        if (style.fontStyle === 'italic') content = `<i>${content}</i>`;
        if ((style.textDecorationLine || style.textDecoration).includes('underline')) content = `<u>${content}</u>`;
      }
      return content;
    }
    return walk(template.content);
  }
  function create({ store, now = () => new Date(), clean = sanitizeHTML, onSaved=()=>{} }) {
    const saved = store.get(KEY,null);
    const state = { v:1, next:Number.isSafeInteger(saved?.next) && saved.next>0 ? saved.next : 1,
      current:typeof saved?.current === 'string' ? saved.current : null,
      letters:Array.isArray(saved?.letters) ? saved.letters.filter(l => l && typeof l.id==='string').map(l => ({id:l.id,title:String(l.title || 'Untitled note'),letterhead:String(l.letterhead || ''),cardIcon:Postcard.normalizeIcon(l.cardIcon),deliverIn:DELIVER[l.deliverIn]?l.deliverIn:'month',body:String(l.body || ''),createdAt:Number(l.createdAt)||0,updatedAt:Number(l.updatedAt)||0})) : [] };
    const get = (id = state.current) => state.letters.find(l => l.id === id);
    if (!get()) state.current = state.letters[0]?.id || null;
    function persist() {
      store.set(KEY,state);
      // Store mirrors writes synchronously to localStorage before its native SQLite flush.
      if (JSON.stringify(store.get(KEY,null)) !== JSON.stringify(state)) throw Error('Could not save on this device. Save as file to keep a copy.');
    }
    function add(roomName) {
      const date=now(),id=`letter-${date.getTime().toString(36)}-${state.next++}`;
      state.letters.unshift({id,title:'Untitled note',letterhead:`${roomName} · ${dateStamp(date)}`,cardIcon:'tulips',deliverIn:'month',body:'',createdAt:date.getTime(),updatedAt:date.getTime()});
      state.current=id;persist();return {...get()};
    }
    function update({letterhead,body,title,cardIcon,deliverIn}) {
      const letter=get();if(!letter)return;
      const old=letter.body;letter.letterhead=String(letterhead);letter.body=clean(body);
      if(title!==undefined)letter.title=String(title).trim()||'Untitled note';
      if(cardIcon!==undefined)letter.cardIcon=Postcard.normalizeIcon(cardIcon);
      if(deliverIn!==undefined&&DELIVER[deliverIn])letter.deliverIn=deliverIn;
      letter.updatedAt=now().getTime();persist();if(letter.body!==old&&letter.body.replace(/<[^>]*>/g,'').trim())onSaved({...letter});
    }
    function select(id) {if(!get(id))return false;state.current=id;persist();return true;}
    function rename(id,title) {const l=get(id);if(!l)return false;l.title=String(title).trim() || 'Untitled note';l.updatedAt=now().getTime();persist();return true;}
    function remove(id) {if(!get(id))return false;state.letters=state.letters.filter(l=>l.id!==id);if(state.current===id)state.current=state.letters[0]?.id || null;persist();return true;}
    return {add,update,select,rename,remove,get:()=>{const l=get();return l && {...l};},list:()=>state.letters.map(l=>({...l})),get current(){return state.current;}};
  }
  function htmlFile(letter, clean = sanitizeHTML) {
    const title=UNTITLED.has(letter.title)?'Note':letter.title;
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">' +
      `<title>${escapeHTML(title)}</title><style>body{margin:0;padding:24px;background:#fbeacb;color:#211d1a;font:18px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}main{box-sizing:border-box;max-width:620px;margin:auto;padding:40px 8%;border-radius:40px;background:#f7f2eb;box-shadow:0 18px 40px -18px #0004}h1{margin:0 0 24px;font-size:30px;line-height:1.2}header{margin-bottom:18px;color:#b0874a;font-size:14px}ul{list-style:none;margin:0;padding:0}li{position:relative;margin:0 0 14px;padding-left:44px}li::before{content:'';position:absolute;left:0;top:2px;width:26px;height:26px;border:2px solid #d2a65a;border-radius:50%;box-sizing:border-box}li[data-checked=true]::before{background:#d2a65a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m7 12 3.5 3.5L17 9' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/18px no-repeat}img{display:block;max-width:100%;border-radius:18px}</style></head><body><main>` +
      `<header>${escapeHTML(letter.letterhead)}</header><h1>${escapeHTML(title)}</h1><article>${clean(letter.body)}</article></main></body></html>\n`;
  }
  async function saveFile({ html, filename, cap = root.Capacitor }) {
    if (cap?.isNativePlatform?.()) return cap.registerPlugin('LetterFiles').save({filename,html});
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);return {saved:true};
  }
  const ICON={
    back:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    share:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M8 11H6v10h12V11h-2"/></svg>',
    more:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="7.5" cy="12" r=".6" fill="currentColor"/><circle cx="12" cy="12" r=".6" fill="currentColor"/><circle cx="16.5" cy="12" r=".6" fill="currentColor"/></svg>',
    close:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    list:'<svg viewBox="0 0 28 24" width="28" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="6" r="3"/><path d="m3.6 6 1 1 1.9-2M12 6h13"/><circle cx="5" cy="17" r="3"/><path d="M12 17h13"/></svg>',
    camera:'<svg viewBox="0 0 28 24" width="30" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5h5l2-3h8l2 3h5v13H3z"/><circle cx="14" cy="13.5" r="4.5"/><path d="M5.5 10h1.5"/></svg>',
    clip:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 7v9a4 4 0 0 1-8 0V6a2.6 2.6 0 0 1 5.2 0v9.5a1.2 1.2 0 0 1-2.4 0V8"/></svg>',
    compose:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13v7H4V4h7"/><path d="m17.5 3.5 3 3L12 15l-4 1 1-4z"/></svg>',
    trash:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
  };
  const UNTITLED=new Set(['Untitled note','Untitled letter']);
  // Shrinks a picked photo so a note stays small enough for on-device storage.
  function photoData(file,max=960){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*k));c.height=Math.max(1,Math.round(img.naturalHeight*k));c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.74));};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('That photo could not be read.'));};img.src=url;
    });
  }
  // Notetaker: a plain notes app with checklists and photos, in the house's notes look.
  function createView({store,sheet,dismiss,sound,roomName,onSaved=()=>{},onWriting=()=>{},beforeOpen=()=>{},onClose=()=>{},sender=()=>'',rememberSender=()=>{},onSendToFuture=()=>{},mailbox={count:()=>0,open:()=>{}}}) {
    const model=create({store,onSaved}),view=document.createElement('section');view.id='lettersView';view.className='notetaker';view.hidden=true;
    view.setAttribute('aria-label','Notetaker');
    view.innerHTML=`<div class="note-editor"><input id="noteTitle" class="note-title" type="text" placeholder="Title" aria-label="Note title" autocomplete="off" enterkeyhint="next">
      <div id="letterScroll" class="note-scroll"><div id="letterBody" class="note-body" role="textbox" aria-multiline="true" aria-label="Note" data-placeholder="Write a note, or tap the list button for a checklist."></div></div></div>
      <section id="letterList" class="note-list" hidden aria-label="All notes"><h3 class="note-list-title">All notes</h3><p class="note-list-sub" id="noteCount"></p><div id="letterRows" class="note-rows"></div></section>
      <div class="note-toolbar" role="toolbar" aria-label="Note tools">
        <button type="button" id="noteChecklist" aria-label="Checklist" title="Checklist">${ICON.list}</button>
        <button type="button" id="noteCamera" aria-label="Take a photo" title="Take a photo">${ICON.camera}</button>
        <button type="button" id="noteAttach" aria-label="Add a photo" title="Add a photo">${ICON.clip}</button>
        <button type="button" id="letterNew" aria-label="New note" title="New note">${ICON.compose}</button>
      </div>
      <input type="file" id="notePhoto" accept="image/*" hidden><span id="letterStatus" class="note-status" role="status" aria-live="polite"></span>`;
    const $=s=>view.querySelector(s),body=$('#letterBody'),titleInput=$('#noteTitle'),scroll=$('#letterScroll'),list=$('#letterList'),status=$('#letterStatus'),photoInput=$('#notePhoto');
    // Header pieces live in the sheet's header row; built once and re-attached on open.
    const allButton=document.createElement('button');allButton.type='button';allButton.id='letterListButton';allButton.className='note-all';
    const exportButton=document.createElement('button');exportButton.type='button';exportButton.id='letterExport';exportButton.className='note-icon';exportButton.setAttribute('aria-label','Save as file');exportButton.title='Save as file';exportButton.innerHTML=ICON.share;
    const moreWrap=document.createElement('div');moreWrap.className='note-more-wrap';
    const moreButton=document.createElement('button');moreButton.type='button';moreButton.id='noteMore';moreButton.className='note-icon';moreButton.setAttribute('aria-label','More');moreButton.title='More';moreButton.setAttribute('aria-haspopup','menu');moreButton.setAttribute('aria-expanded','false');moreButton.innerHTML=ICON.more;
    const moreMenu=document.createElement('div');moreMenu.className='note-menu';moreMenu.setAttribute('role','menu');moreMenu.setAttribute('aria-label','Note options');moreMenu.hidden=true;
    const menuItem=(label,id)=>{const b=document.createElement('button');b.type='button';b.id=id;b.setAttribute('role','menuitem');b.textContent=label;moreMenu.appendChild(b);return b;};
    const sendItem=menuItem('Send to future you','letterSend'),deleteItem=menuItem('Delete note','noteDelete');
    moreWrap.append(moreButton,moreMenu);
    let active=false,timer=null,lastRange=null,lastFocus=null,photoMode='';
    function message(text) {status.textContent=text;}
    function safe(action) {try{return action();}catch(e){message(e.message || 'Could not save on this device.');return false;}}
    const titleOf=l=>UNTITLED.has(l?.title)?'':(l?.title||'');
    function paintAll(){const listing=!list.hidden;allButton.innerHTML=ICON.back+`<span>${listing?'Back':'All notes'}</span>`;allButton.setAttribute('aria-label',listing?'Back to the note':'All notes');view.classList.toggle('is-listing',listing);}
    function flush() {
      clearTimeout(timer);timer=null;if(!active || !model.current)return;
      const note=model.get();if(!note)return;
      safe(()=>{model.update({letterhead:note.letterhead,body:body.innerHTML,title:titleInput.value||'Untitled note'});message('Saved');});
    }
    function schedule() {message('Saving…');clearTimeout(timer);timer=setTimeout(flush,250);}
    function paintEmpty(){body.classList.toggle('is-empty',!body.textContent.trim()&&!body.querySelector('img,li'));}
    function load() {
      const l=model.get();
      titleInput.value=titleOf(l);body.innerHTML=sanitizeHTML(l?.body || '');paintEmpty();
      body.contentEditable=l?'true':'false';titleInput.disabled=!l;
      [exportButton,moreButton,$('#noteChecklist'),$('#noteCamera'),$('#noteAttach')].forEach(b=>b.disabled=!l);
      lastRange=null;scroll.scrollTop=0;message(l?'Saved':'Start a new note');
    }
    function remember() {
      if(!active)return;const s=window.getSelection();if(!s.rangeCount)return;const r=s.getRangeAt(0);
      if(body.contains(r.commonAncestorContainer))lastRange=r.cloneRange();
      $('#noteChecklist').setAttribute('aria-pressed',String(!!currentItem()));
    }
    function restore() {
      const s=window.getSelection();let r=lastRange;
      if(!r || !r.startContainer.isConnected || !body.contains(r.commonAncestorContainer)) {r=document.createRange();r.selectNodeContents(body);r.collapse(false);}
      body.focus({preventScroll:true});s.removeAllRanges();s.addRange(r);return r;
    }
    function currentItem(){const s=window.getSelection();const n=s.rangeCount?s.anchorNode:null;const el=n&&(n.nodeType===1?n:n.parentElement);return el&&body.contains(el)?el.closest('li'):null;}
    function keepCaret() {
      if(!active || document.activeElement!==body)return;
      const s=window.getSelection();if(!s.rangeCount)return;const rect=s.getRangeAt(0).getBoundingClientRect(),bounds=scroll.getBoundingClientRect();
      if(!rect.height)return;if(rect.bottom>bounds.bottom-48)scroll.scrollTop+=rect.bottom-(bounds.bottom-48);
      else if(rect.top<bounds.top+12)scroll.scrollTop-=bounds.top+12-rect.top;
    }
    function viewport() {if(active)requestAnimationFrame(keepCaret);}
    function format(command) {if(!model.current)return;restore();document.execCommand('styleWithCSS',false,false);document.execCommand(command,false);remember();schedule();}
    function insert(text,html=false) {restore();document.execCommand(html?'insertHTML':'insertText',false,text);remember();paintEmpty();schedule();requestAnimationFrame(keepCaret);}
    // The list button turns the current line into a checklist item, or back into a line.
    function checklist(){if(!model.current)return;restore();document.execCommand('insertUnorderedList',false);remember();paintEmpty();schedule();}
    function toggleItem(li){if(li.dataset.checked==='true')delete li.dataset.checked;else li.dataset.checked='true';schedule();}
    const ago=t=>new Date(t||Date.now()).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
    function rows() {
      const box=$('#letterRows');box.replaceChildren();const notes=model.list();
      $('#noteCount').textContent=notes.length?`${notes.length} note${notes.length===1?'':'s'}, saved on this device`:'No notes yet. Tap the pencil to start one.';
      for(const l of notes) {
        const row=document.createElement('div');row.className='note-row'+(l.id===model.current?' is-current':'');row.dataset.letter=l.id;
        const name=titleOf(l)||'New note',open=document.createElement('button');open.type='button';open.className='note-row-open';open.setAttribute('aria-label','Open '+name);
        const t=document.createElement('b');t.textContent=name;const meta=document.createElement('small');const plain=sanitizeHTML(l.body).replace(/<li[^>]*>/g,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
        meta.textContent=ago(l.updatedAt||l.createdAt)+(plain?' · '+plain.slice(0,60):'');open.append(t,meta);
        open.onclick=()=>{flush();safe(()=>model.select(l.id));load();hideList();body.focus();};
        const del=document.createElement('button');del.type='button';del.className='note-row-delete';del.setAttribute('aria-label','Delete '+name);del.innerHTML=ICON.trash;
        del.onclick=()=>{if(!del.dataset.confirm){del.dataset.confirm='yes';del.textContent='Delete?';return;}flush();safe(()=>model.remove(l.id));load();rows();};
        row.append(open,del);box.appendChild(row);
      }
    }
    function showList() {flush();closeMore(false);rows();list.hidden=false;paintAll();(list.querySelector('.note-row-open')||allButton).focus({preventScroll:true});}
    function hideList() {list.hidden=true;paintAll();}
    function openMore(){moreMenu.hidden=false;moreButton.setAttribute('aria-expanded','true');sendItem.focus();document.addEventListener('pointerdown',outsideMore,true);}
    function closeMore(focus){if(moreMenu.hidden)return;moreMenu.hidden=true;moreButton.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outsideMore,true);if(focus)moreButton.focus({preventScroll:true});}
    function outsideMore(e){if(!moreWrap.contains(e.target))closeMore(false);}
    function newNote(){flush();safe(()=>model.add(roomName()));load();hideList();titleInput.focus();}
    function close(focus=true) {if(!active)return;flush();closeMore(false);active=false;view.hidden=true;hideList();view.remove();onWriting(false);dismiss();if(focus){if(lastFocus?.isConnected&&lastFocus!==document.body)lastFocus.focus({preventScroll:true});else onClose();}}
    function open() {
      if(active)return;lastFocus=document.activeElement;beforeOpen();
      // codeSheet closes any previous editor. Activate only after the shared sheet is built.
      sheet('Notetaker','',h=>{
        h('div','letter-sheet-content').appendChild(view);
        const host=view.closest('#sheetBody'),closeButton=host?.querySelector('.sheet-close'),title=host?.querySelector(':scope > h2');
        if(title)title.classList.add('note-sheet-title');
        if(closeButton){
          const header=document.createElement('div');header.className='note-heading';header.dataset.controlHeader='true';(title||closeButton).before(header);
          const spacer=document.createElement('span');spacer.className='note-spacer';
          closeButton.id='letterClose';closeButton.classList.add('note-icon');closeButton.innerHTML=ICON.close;closeButton.onclick=()=>close();
          header.append(allButton,spacer,exportButton,moreWrap,closeButton);
        }
      });
      active=true;view.hidden=false;hideList();
      if(!model.current)safe(()=>model.add(roomName()));load();viewport();onWriting(true);
      // Opening does not summon the mobile keyboard until the owner taps the note.
      view.closest('#sheetBody')?.querySelector('#letterClose')?.focus({preventScroll:true});
    }
    allButton.onclick=()=>list.hidden?showList():(hideList(),body.focus());
    $('#letterNew').onclick=newNote;
    $('#noteChecklist').onclick=checklist;
    const pick=mode=>{if(!model.current)return;photoMode=mode;remember();if(mode==='camera')photoInput.setAttribute('capture','environment');else photoInput.removeAttribute('capture');photoInput.value='';photoInput.click();};
    $('#noteCamera').onclick=()=>pick('camera');$('#noteAttach').onclick=()=>pick('library');
    photoInput.onchange=async()=>{const file=photoInput.files?.[0];if(!file)return;message('Adding photo…');
      try{const src=await photoData(file);restore();const li=currentItem();
        // A photo gets its own line under the list rather than living inside a checklist item.
        if(li){const list=li.closest('ul'),line=document.createElement('p');line.appendChild(document.createElement('br'));list.after(line);const r=document.createRange();r.setStart(line,0);r.collapse(true);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);lastRange=r.cloneRange();}
        insert(`<p><img src="${src}" alt="Photo"></p><p><br></p>`,true);}catch(e){message(e.message||'That photo could not be added.');}};
    view.querySelectorAll('.note-toolbar button').forEach(b=>b.addEventListener('pointerdown',e=>{if(b.id!=='letterNew'){remember();e.preventDefault();}}));
    moreButton.onclick=()=>moreMenu.hidden?openMore():closeMore(true);
    moreMenu.addEventListener('keydown',e=>{const items=[sendItem,deleteItem],i=items.indexOf(document.activeElement);
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}else if(e.key==='Tab')closeMore(false);});
    deleteItem.onclick=()=>{if(!deleteItem.dataset.confirm){deleteItem.dataset.confirm='yes';deleteItem.textContent='Delete for good?';return;}delete deleteItem.dataset.confirm;deleteItem.textContent='Delete note';closeMore(false);const id=model.current;if(id)safe(()=>model.remove(id));if(!model.current)safe(()=>model.add(roomName()));load();message('Note deleted');};
    sendItem.onclick=()=>{
      closeMore(false);flush();const snap=model.get();
      if(!snap || !snap.body.replace(/<[^>]*>/g,'').trim()){message('Write a little first.');return;}
      onSendToFuture({title:snap.title,body:snap.body,letterhead:snap.letterhead,cardIcon:snap.cardIcon,from:sender(),to:'Me',deliverOn:deliverDate(snap.deliverIn)});
    };
    titleInput.addEventListener('input',schedule);
    titleInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();body.focus();}});
    titleInput.addEventListener('blur',flush);
    exportButton.onclick=async()=>{
      flush();const l=model.get();if(!l)return;exportButton.disabled=true;
      try{const result=await saveFile({html:htmlFile(l),filename:`note-${day(new Date())}.html`});message(result.saved?'File saved': 'Export cancelled');}
      catch(e){message('Could not save the file. Your note is still here.');}
      finally{exportButton.disabled=!model.current;}
    };
    // Tapping a checklist circle ticks it; the text stays editable.
    body.addEventListener('pointerdown',e=>{const li=e.target.closest?.('li');if(!li||!body.contains(li))return;const r=li.getBoundingClientRect();if(e.clientX-r.left<=34){e.preventDefault();toggleItem(li);}});
    body.addEventListener('input',()=>{paintEmpty();schedule();remember();requestAnimationFrame(keepCaret);});
    const paste=e=>{
      e.preventDefault();const data=e.clipboardData || e.dataTransfer;if(!data)return;remember();
      const html=data.getData('text/html'),text=data.getData('text/plain');
      if(html)insert(sanitizeHTML(html),true);else insert(text);
    };
    body.addEventListener('paste',paste);body.addEventListener('drop',paste);body.addEventListener('blur',flush);
    document.addEventListener('selectionchange',remember);
    window.addEventListener('keydown',e=>{
      if(!active)return;
      if(e.key==='Tab'){
        const host=view.closest('#sheetBody')||view,items=[...host.querySelectorAll('button:not(:disabled),input:not([type=file]):not(:disabled),[contenteditable="true"]')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));
        const first=items[0],last=items[items.length-1];
        if(items.length && (e.shiftKey && (document.activeElement===first || !items.includes(document.activeElement)) || !e.shiftKey && (document.activeElement===last || !items.includes(document.activeElement)))){e.preventDefault();(e.shiftKey?last:first).focus();}
      }
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!moreMenu.hidden)closeMore(true);else if(!list.hidden){hideList();body.focus();}else close();return;}
      if(list.hidden && document.activeElement===body && (e.ctrlKey || e.metaKey) && e.key==='Enter'){const li=currentItem();if(li){e.preventDefault();toggleItem(li);}return;}
      if(list.hidden && (e.ctrlKey || e.metaKey) && !e.altKey && ['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();format({b:'bold',i:'italic',u:'underline'}[e.key.toLowerCase()]);}
    },true);
    window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});window.addEventListener('pagehide',flush);
    paintAll();
    return {open,close,flush,model,view,get active(){return active;}};
  }
  const api={KEY,DELIVER,deliverDate,day,dateStamp,escapeHTML,sanitizeHTML,create,htmlFile,saveFile,createView};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.LRLetters=api;
})(typeof window!=='undefined'?window:globalThis);
