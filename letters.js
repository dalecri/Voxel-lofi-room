// A private stack of letters. No room data, remote services or shared-code fields.
(function (root) {
  const Postcard=typeof module!=='undefined'&&module.exports?require('./mail-window.js'):root.LRMailWindow;
  const KEY = 'lr.letters';
  // When Send to future should deliver, chosen on the letter itself.
  const DELIVER = {tomorrow:['Tomorrow',d=>d.setDate(d.getDate()+1)],week:['In 1 week',d=>d.setDate(d.getDate()+7)],month:['In 1 month',d=>d.setMonth(d.getMonth()+1)],year:['In 1 year',d=>d.setFullYear(d.getFullYear()+1)]};
  const deliverDate = (key,from=new Date()) => {const d=new Date(from.getFullYear(),from.getMonth(),from.getDate(),12);(DELIVER[key]||DELIVER.month)[1](d);return day(d);};
  const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const cardDate = date => `${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}.${date.getFullYear()}`;
  const dateStamp = date => date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  // Parse in an inert template, never a live document. Pasted images/styles cannot fetch.
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
      letters:Array.isArray(saved?.letters) ? saved.letters.filter(l => l && typeof l.id==='string').map(l => ({id:l.id,title:String(l.title || 'Untitled letter'),letterhead:String(l.letterhead || ''),cardIcon:Postcard.normalizeIcon(l.cardIcon),deliverIn:DELIVER[l.deliverIn]?l.deliverIn:'month',body:String(l.body || ''),createdAt:Number(l.createdAt)||0,updatedAt:Number(l.updatedAt)||0})) : [] };
    const get = (id = state.current) => state.letters.find(l => l.id === id);
    if (!get()) state.current = state.letters[0]?.id || null;
    function persist() {
      store.set(KEY,state);
      // Store mirrors writes synchronously to localStorage before its native SQLite flush.
      if (JSON.stringify(store.get(KEY,null)) !== JSON.stringify(state)) throw Error('Could not save on this device. Save as file to keep a copy.');
    }
    function add(roomName) {
      const date=now(),id=`letter-${date.getTime().toString(36)}-${state.next++}`;
      state.letters.unshift({id,title:'Untitled letter',letterhead:`${roomName} · ${dateStamp(date)}`,cardIcon:'tulips',deliverIn:'month',body:'',createdAt:date.getTime(),updatedAt:date.getTime()});
      state.current=id;persist();return {...get()};
    }
    function update({letterhead,body,title,cardIcon,deliverIn}) {
      const letter=get();if(!letter)return;
      const old=letter.body;letter.letterhead=String(letterhead);letter.body=clean(body);
      if(title!==undefined)letter.title=String(title).trim()||'Untitled letter';
      if(cardIcon!==undefined)letter.cardIcon=Postcard.normalizeIcon(cardIcon);
      if(deliverIn!==undefined&&DELIVER[deliverIn])letter.deliverIn=deliverIn;
      letter.updatedAt=now().getTime();persist();if(letter.body!==old&&letter.body.replace(/<[^>]*>/g,'').trim())onSaved({...letter});
    }
    function select(id) {if(!get(id))return false;state.current=id;persist();return true;}
    function rename(id,title) {const l=get(id);if(!l)return false;l.title=String(title).trim() || 'Untitled letter';l.updatedAt=now().getTime();persist();return true;}
    function remove(id) {if(!get(id))return false;state.letters=state.letters.filter(l=>l.id!==id);if(state.current===id)state.current=state.letters[0]?.id || null;persist();return true;}
    return {add,update,select,rename,remove,get:()=>{const l=get();return l && {...l};},list:()=>state.letters.map(l=>({...l})),get current(){return state.current;}};
  }
  function htmlFile(letter, clean = sanitizeHTML) {
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">' +
      `<title>${escapeHTML(letter.title)}</title><style>body{margin:0;padding:24px;background:#ede5d9;color:#344c38;font:18px/1.6 'Courier New',monospace}main{box-sizing:border-box;max-width:700px;margin:auto;padding:40px 7%;border:4px solid #393047;box-shadow:inset 0 0 0 4px #839576,inset 0 0 0 7px #fcf6ec,inset 0 0 0 9px #d58a9c;background:repeating-linear-gradient(0deg,#b99e7910 0 8px,transparent 8px 16px),repeating-linear-gradient(90deg,#b99e7910 0 8px,transparent 8px 16px),#fcf6ec;overflow-wrap:anywhere}header{font-size:14px;border-bottom:1px solid #a7b09b;padding-bottom:20px;white-space:pre-wrap}h1{font-size:25px;color:#c35d7b}.picture{float:right;display:grid;place-items:center;width:44px;height:48px;margin:0 0 8px 12px;border:3px dashed #393047;background:#fffcfa}.picture svg{width:30px;height:30px;image-rendering:pixelated}article{white-space:pre-wrap}p,article div{margin:0 0 .25em}footer{margin-top:30px;padding-top:16px;border-top:1px solid #a7b09b;text-align:right;font-size:13px;color:#71836b}@media print{body{padding:0}main{max-width:none}}</style></head><body><main>` +
      `<div class="picture">${Postcard.art(letter.cardIcon)}</div><header>${escapeHTML(letter.letterhead)}</header><h1>${escapeHTML(letter.title)}</h1><article>${clean(letter.body)}</article><footer>A LITTLE LETTER, JUST YOURS.</footer></main></body></html>\n`;
  }
  async function saveFile({ html, filename, cap = root.Capacitor }) {
    if (cap?.isNativePlatform?.()) return cap.registerPlugin('LetterFiles').save({filename,html});
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);return {saved:true};
  }
  function createView({store,sheet,dismiss,sound,roomName,onSaved=()=>{},onWriting=()=>{},beforeOpen=()=>{},onClose=()=>{},sender=()=>'',rememberSender=()=>{},onSendToFuture=()=>{},mailbox={count:()=>0,open:()=>{}}}) {
    const model=create({store,onSaved}),view=document.createElement('section');view.id='lettersView';view.hidden=true;
    view.setAttribute('aria-label','Write a letter');
    view.innerHTML=`<div class="letter-chrome"><span id="letterStatus" role="status" aria-live="polite"></span><button type="button" id="letterListButton"><span class="letter-pill-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></span>Letters</button><button type="button" id="letterExport">Save as file</button></div>
      <div id="letterScroll" class="letter-stage"></div>
      <section id="letterList" hidden role="dialog" aria-label="Your letters"><div class="letter-stack"><div class="letter-list-top"><h2>Your letters</h2><button type="button" class="mailwin-btn mailwin-small" id="letterListClose">Back to the letter</button></div><p>Saved on this device. Only a file you choose to export leaves your room.</p><button type="button" class="mailwin-btn" id="letterNew">New letter</button><div id="letterRows"></div></div></section>`;
    const windowUi=root.LRMailWindow.create({postcard:true,onIconChange:()=>schedule(),title:'Typewriter',icon:'typewriter',label:'Write a letter',from:sender(),to:'Me',subject:'',richText:true,bodyId:'letterBody',placeholder:'Dear friend,',buttons:[{label:'Save',id:'letterSave'},{label:'Send to future',className:'mailwin-send',id:'letterSend'}]});
    // Keep editing controls outside the scrolling paper, inside the shared sheet.
    const machine=document.createElement('div');machine.className='letter-machine';
    machine.append(windowUi.toolbar,windowUi.actions);
    const card=document.createElement('div');card.className='letter-card';
    card.appendChild(windowUi.form);
    view.querySelector('#letterScroll').appendChild(card);
    view.querySelector('#letterScroll').after(machine);
    const $=s=>view.querySelector(s),body=windowUi.body,subject=windowUi.fields.Subject,from=windowUi.fields.From,to=windowUi.fields.To,scroll=$('#letterScroll'),list=$('#letterList'),status=$('#letterStatus');
    // Writing comes first; addresses, signature and stamp choices share one quiet disclosure.
    const subjectRow=subject.closest('label');subjectRow.classList.add('letter-subject');
    const head=windowUi.form.querySelector('.mailwin-head'),details=document.createElement('details');details.className='letter-details';
    const summary=document.createElement('summary');summary.textContent='Letter details';
    head.before(subjectRow,details);details.append(summary,head,windowUi.form.querySelector('.postcard-signature'),windowUi.foot);
    const meta=document.createElement('div');meta.className='letter-meta';details.before(meta);meta.appendChild(details);
    const deliverButton=document.createElement('button');deliverButton.type='button';deliverButton.className='letter-deliver';meta.appendChild(deliverButton);
    const post=document.createElement('div');post.className='letter-post';post.setAttribute('aria-hidden','true');post.innerHTML='<span>POST</span>';card.prepend(post);
    const foot=document.createElement('div');foot.className='letter-foot';const words=document.createElement('span'),stamp=document.createElement('span');words.className='letter-words';stamp.className='letter-stampdate';foot.append(words,stamp);windowUi.form.querySelector('.mailwin-page').after(foot);
    const countWords=()=>{const n=(body.textContent||'').trim().split(/\s+/).filter(Boolean).length;words.textContent=`${n} word${n===1?'':'s'}`;};
    function paintDeliver(){const key=model.get()?.deliverIn||'month';deliverButton.innerHTML='';const b=document.createElement('b');b.textContent='Deliver:';deliverButton.append(b,' '+DELIVER[key][0]);deliverButton.setAttribute('aria-label',`Deliver ${DELIVER[key][0].toLowerCase()}. Change delivery time`);}
    deliverButton.onclick=()=>{const l=model.get();if(!l)return;const keys=Object.keys(DELIVER),next=keys[(keys.indexOf(l.deliverIn||'month')+1)%keys.length];safe(()=>{model.update({letterhead:l.letterhead,body:body.innerHTML,title:subject.value,deliverIn:next});message('Saved');});paintDeliver();};
    const dateButton=windowUi.toolbar.querySelector('#letterDate');if(dateButton)dateButton.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg><span>Date stamp</span>';
    const sendButton=windowUi.buttons['Send to future'];sendButton.innerHTML='<span>Send to future</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
    const exportButton=$('#letterExport');exportButton.setAttribute('aria-label','Save as file');exportButton.title='Save as file';
    exportButton.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/></svg>';
    let active=false,timer=null,lastRange=null,lastFocus=null,lastClack=-Infinity,lastBell=-Infinity,beforeLine=null,composing=false,compositionLine=null;
    function message(text) {status.textContent=text;}
    function safe(action) {try{return action();}catch(e){message(e.message || 'Could not save on this device.');return false;}}
    function flush() {
      clearTimeout(timer);timer=null;if(!active || !model.current)return;
      const letter=model.get();if(!letter)return;
      safe(()=>{rememberSender(from.value);model.update({letterhead:letter.letterhead,body:body.innerHTML,title:subject.value,cardIcon:windowUi.postcard.icon});message('Saved');});
    }
    function schedule() {message('Saving…');clearTimeout(timer);timer=setTimeout(flush,250);}
    function load() {
      const l=model.get();
      windowUi.postcard.setDate(l?cardDate(new Date(l.createdAt||Date.now())):'');
      stamp.textContent=l?new Date(l.createdAt||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase():'';
      subject.value=l?.title || '';from.value=sender();windowUi.postcard.set(l?.cardIcon);body.innerHTML=sanitizeHTML(l?.body || '');
      countWords();paintDeliver();deliverButton.disabled=!l;
      body.contentEditable=l?'true':'false';subject.disabled=from.disabled=to.disabled=!l;
      $('#letterExport').disabled=!l;windowUi.buttons.Save.disabled=!l;windowUi.buttons['Send to future'].disabled=!l;
      view.querySelectorAll('.letter-tools button').forEach(b=>b.disabled=!l);
      lastRange=null;scroll.scrollTop=0;message(l?'Saved':'Start a new letter');
    }
    function remember() {
      if(!active)return;const s=window.getSelection();if(!s.rangeCount)return;const r=s.getRangeAt(0);
      if(body.contains(r.commonAncestorContainer))lastRange=r.cloneRange();
      view.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(body.contains(r.commonAncestorContainer) && document.queryCommandState(b.dataset.format))));
    }
    function restore() {
      const s=window.getSelection();let r=lastRange;
      if(!r || !r.startContainer.isConnected || !body.contains(r.commonAncestorContainer)) {r=document.createRange();r.selectNodeContents(body);r.collapse(false);}
      body.focus({preventScroll:true});s.removeAllRanges();s.addRange(r);return r;
    }
    function caretLine() {
      const s=window.getSelection();if(!s.rangeCount || !body.contains(s.anchorNode))return null;
      const r=s.getRangeAt(0).cloneRange();r.collapse(false);const rect=r.getClientRects()[0];
      return rect && rect.height ? rect.top-scroll.getBoundingClientRect().top+scroll.scrollTop : null;
    }
    function keepCaret() {
      if(!active || document.activeElement!==body)return;
      const s=window.getSelection();if(!s.rangeCount)return;const rect=s.getRangeAt(0).getBoundingClientRect(),bounds=scroll.getBoundingClientRect();
      if(!rect.height)return;if(rect.bottom>bounds.bottom-96)scroll.scrollTop+=rect.bottom-(bounds.bottom-96);
      else if(rect.top<bounds.top+12)scroll.scrollTop-=bounds.top+12-rect.top;
    }
    function viewport() {
      if(active)requestAnimationFrame(keepCaret);
    }
    function clack() {const t=performance.now();if(t-lastClack>=65){lastClack=t;sound.clack(1,false);}}
    function format(command) {if(!model.current)return;restore();document.execCommand('styleWithCSS',false,false);document.execCommand(command,false);remember();schedule();}
    function insert(text,html=false) {restore();document.execCommand(html?'insertHTML':'insertText',false,text);remember();schedule();requestAnimationFrame(keepCaret);}
    function rows() {
      const box=$('#letterRows');box.replaceChildren();
      if(!model.list().length){const p=document.createElement('p');p.textContent='No letters yet. There is plenty of paper.';box.appendChild(p);}
      for(const l of model.list()) {
        const row=document.createElement('div');row.className='letter-row';row.dataset.letter=l.id;
        const title=document.createElement('input');title.value=l.title;title.setAttribute('aria-label','Rename '+l.title);
        const open=document.createElement('button');open.type='button';open.className='mailwin-btn mailwin-small';open.textContent='Open';open.setAttribute('aria-label','Open '+l.title);
        open.onclick=()=>{flush();safe(()=>model.select(l.id));load();list.hidden=true;body.focus();};
        const del=document.createElement('button');del.type='button';del.className='mailwin-btn mailwin-small';del.textContent='Delete';del.setAttribute('aria-label','Delete '+l.title);
        title.onchange=()=>safe(()=>{
          model.rename(l.id,title.value);const saved=model.list().find(x=>x.id===l.id);title.value=saved.title;
          title.setAttribute('aria-label','Rename '+saved.title);open.setAttribute('aria-label','Open '+saved.title);del.setAttribute('aria-label','Delete '+saved.title);
          if(model.current===l.id)subject.value=saved.title;
        });
        del.onclick=()=>{if(!del.dataset.confirm){del.dataset.confirm='yes';del.textContent='Delete for good?';return;}flush();safe(()=>model.remove(l.id));load();rows();};
        row.append(title,open,del);box.appendChild(row);
      }
    }
    function showList() {flush();rows();list.hidden=false;$('#letterNew').focus();}
    function close(focus=true) {if(!active)return;flush();active=false;view.hidden=true;list.hidden=true;view.remove();onWriting(false);dismiss();if(focus){if(lastFocus?.isConnected&&lastFocus!==document.body)lastFocus.focus({preventScroll:true});else onClose();}}
    function open() {
      if(active)return;lastFocus=document.activeElement;beforeOpen();
      // codeSheet closes any previous editor. Activate only after the shared sheet is built.
      sheet('Typewriter','',h=>{
        h('div','letter-sheet-content').appendChild(view);
        const host=view.closest('#sheetBody'),closeButton=host?.querySelector('.sheet-close'),title=host?.querySelector(':scope > h2');
        if(closeButton&&title){
          const header=document.createElement('div');header.className='letter-heading';header.dataset.controlHeader='true';title.before(header);header.append(title,closeButton);
          closeButton.id='letterClose';closeButton.onclick=()=>{if(!list.hidden){list.hidden=true;body.focus();}else close();};
          if(!header.querySelector('.control-back')){const back=document.createElement('button');back.type='button';back.className='chipbtn sheet-icon control-back letter-back';back.setAttribute('aria-label','Back');back.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>';back.onclick=()=>{if(!list.hidden){list.hidden=true;body.focus();}else close();};header.prepend(back);}
          const mail=document.createElement('button');mail.type='button';mail.className='chipbtn sheet-icon letter-mailbox';mail.id='letterMailbox';const n=Math.max(0,Number(mailbox.count())||0);
          mail.setAttribute('aria-label',n?`Future mailbox, ${n} letter${n===1?'':'s'} waiting`:'Future mailbox');
          mail.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>'+(n?`<span class="letter-badge" aria-hidden="true">${n>9?'9+':n}</span>`:'');
          mail.onclick=()=>{close(false);mailbox.open();};closeButton.before(mail);
        }
      });
      active=true;view.hidden=false;list.hidden=true;details.open=false;
      if(!model.current)safe(()=>model.add(roomName()));load();viewport();onWriting(true);sound.clack(1,false);sound.carriageReturn();
      // Opening the paper does not summon the mobile keyboard until the owner taps it.
      view.closest('#sheetBody')?.querySelector('#letterClose')?.focus({preventScroll:true});
    }
    $('#letterListButton').onclick=showList;$('#letterListClose').onclick=()=>{list.hidden=true;body.focus();};
    $('#letterNew').onclick=()=>{flush();safe(()=>model.add(roomName()));load();list.hidden=true;body.focus();};
    windowUi.buttons.Save.onclick=()=>flush();
    windowUi.buttons['Send to future'].onclick=()=>{
      flush();const snap=model.get();
      if(!snap || !snap.body.replace(/<[^>]*>/g,'').trim()){message('Write a little first.');return;}
      onSendToFuture({title:snap.title,body:snap.body,letterhead:snap.letterhead,cardIcon:snap.cardIcon,from:from.value,to:to.value.trim()||'Me',deliverOn:deliverDate(snap.deliverIn)});
    };
    from.addEventListener('change',()=>safe(()=>rememberSender(from.value)));
    subject.addEventListener('input',schedule);
    subject.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();body.focus();}});
    subject.addEventListener('blur',flush);
    view.querySelectorAll('.letter-tools button').forEach(b=>b.addEventListener('pointerdown',e=>{remember();e.preventDefault();}));
    view.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>format(b.dataset.format));
    $('#letterDate').onclick=()=>{insert(dateStamp(new Date()));clack();};
    $('#letterExport').onclick=async()=>{
      flush();const l=model.get();if(!l)return;const button=$('#letterExport');button.disabled=true;
      try{const result=await saveFile({html:htmlFile(l),filename:`letter-${day(new Date())}.html`});message(result.saved?'File saved': 'Export cancelled');}
      catch(e){message('Could not save the file. Your draft is still here.');}
      finally{button.disabled=!model.current;}
    };
    body.addEventListener('beforeinput',e=>{
      beforeLine=caretLine();if(/^(insertText|insertCompositionText|deleteCompositionText|insertParagraph|insertLineBreak|deleteContentBackward|deleteContentForward)$/.test(e.inputType))clack();
    });
    body.addEventListener('input',countWords);
    body.addEventListener('input',e=>{
      schedule();remember();const after=caretLine(),t=performance.now();
      if(!composing && /^(insertText|insertParagraph|insertLineBreak)$/.test(e.inputType) && beforeLine!==null && after!==null && after>beforeLine+8 && t-lastBell>200){sound.typeBell();lastBell=t;}
      requestAnimationFrame(keepCaret);
    });
    body.addEventListener('compositionstart',()=>{composing=true;compositionLine=caretLine();});
    body.addEventListener('compositionend',()=>{composing=false;clack();schedule();const line=caretLine(),t=performance.now();if(compositionLine!==null && line!==null && line>compositionLine+8 && t-lastBell>200){sound.typeBell();lastBell=t;}});
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
        const scope=list.hidden?(view.closest('#sheetBody')||view):list,header=list.hidden?[]:[...(view.closest('#sheetBody')?.querySelectorAll('.control-return-actions button,.letter-heading button')||[])],items=[...header,...scope.querySelectorAll('button:not(:disabled),input,summary,[contenteditable="true"],[contenteditable="plaintext-only"]')].filter(n=>n.getClientRects().length);
        const first=items[0],last=items[items.length-1];
        if(items.length && (e.shiftKey && (document.activeElement===first || !items.includes(document.activeElement)) || !e.shiftKey && (document.activeElement===last || !items.includes(document.activeElement)))){e.preventDefault();(e.shiftKey?last:first).focus();}
      }
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!list.hidden){list.hidden=true;body.focus();}else close();return;}
      if(list.hidden && (e.ctrlKey || e.metaKey) && !e.altKey && ['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();format({b:'bold',i:'italic',u:'underline'}[e.key.toLowerCase()]);}
    },true);
    window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});window.addEventListener('pagehide',flush);
    return {open,close,flush,model,view,get active(){return active;}};
  }
  const api={KEY,DELIVER,deliverDate,day,dateStamp,escapeHTML,sanitizeHTML,create,htmlFile,saveFile,createView};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.LRLetters=api;
})(typeof window!=='undefined'?window:globalThis);
