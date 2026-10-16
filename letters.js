// A private stack of letters. No room data, remote services or shared-code fields.
(function (root) {
  const KEY = 'lr.letters';
  const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
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
      letters:Array.isArray(saved?.letters) ? saved.letters.filter(l => l && typeof l.id==='string').map(l => ({id:l.id,title:String(l.title || 'Untitled letter'),letterhead:String(l.letterhead || ''),body:String(l.body || ''),createdAt:Number(l.createdAt)||0,updatedAt:Number(l.updatedAt)||0})) : [] };
    const get = (id = state.current) => state.letters.find(l => l.id === id);
    if (!get()) state.current = state.letters[0]?.id || null;
    function persist() {
      store.set(KEY,state);
      // Store mirrors writes synchronously to localStorage before its native SQLite flush.
      if (JSON.stringify(store.get(KEY,null)) !== JSON.stringify(state)) throw Error('Could not save on this device. Save as file to keep a copy.');
    }
    function add(roomName) {
      const date=now(),id=`letter-${date.getTime().toString(36)}-${state.next++}`;
      state.letters.unshift({id,title:'Untitled letter',letterhead:`${roomName} · ${dateStamp(date)}`,body:'',createdAt:date.getTime(),updatedAt:date.getTime()});
      state.current=id;persist();return {...get()};
    }
    function update({letterhead,body}) {
      const letter=get();if(!letter)return;
      const old=letter.body;letter.letterhead=String(letterhead);letter.body=clean(body);letter.updatedAt=now().getTime();persist();if(letter.body!==old&&letter.body.replace(/<[^>]*>/g,'').trim())onSaved({...letter});
    }
    function select(id) {if(!get(id))return false;state.current=id;persist();return true;}
    function rename(id,title) {const l=get(id);if(!l)return false;l.title=String(title).trim() || 'Untitled letter';l.updatedAt=now().getTime();persist();return true;}
    function remove(id) {if(!get(id))return false;state.letters=state.letters.filter(l=>l.id!==id);if(state.current===id)state.current=state.letters[0]?.id || null;persist();return true;}
    return {add,update,select,rename,remove,get:()=>{const l=get();return l && {...l};},list:()=>state.letters.map(l=>({...l})),get current(){return state.current;}};
  }
  function htmlFile(letter, clean = sanitizeHTML) {
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">' +
      `<title>${escapeHTML(letter.title)}</title><style>body{margin:0;background:#f5eedc;color:#443c34;font:18px/1.8 'Courier New',monospace}main{max-width:700px;margin:auto;padding:64px 8vw;overflow-wrap:anywhere}header{font-size:14px;border-bottom:1px solid #d4c9b5;padding-bottom:20px;margin-bottom:40px;white-space:pre-wrap}article{white-space:pre-wrap}p,article div{margin:0 0 .25em}@media print{body{background:white}main{padding:20px}}</style></head><body><main>` +
      `<header>${escapeHTML(letter.letterhead)}</header><article>${clean(letter.body)}</article></main></body></html>\n`;
  }
  async function saveFile({ html, filename, cap = root.Capacitor }) {
    if (cap?.isNativePlatform?.()) return cap.registerPlugin('LetterFiles').save({filename,html});
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);return {saved:true};
  }
  function createView({store,sound,roomName,onSaved=()=>{},onWriting=()=>{},beforeOpen=()=>{}}) {
    const model=create({store,onSaved}),view=document.createElement('section');view.id='lettersView';view.hidden=true;
    view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','Write a letter');
    view.innerHTML=`<header class="letter-chrome"><button type="button" id="letterClose">← Room</button><span id="letterStatus" role="status" aria-live="polite"></span><button type="button" id="letterListButton">Letters</button><button type="button" id="letterExport">Save as file</button></header>
      <div id="letterScroll"><main class="letter-paper"><div id="letterHead" contenteditable="plaintext-only" role="textbox" aria-label="Letterhead" spellcheck="false"></div><div id="letterBody" contenteditable="true" role="textbox" aria-label="Letter body" aria-multiline="true" data-placeholder="Dear friend," spellcheck="true"></div></main></div>
      <nav class="letter-tools" aria-label="Letter formatting"><button type="button" data-format="bold" aria-label="Bold" aria-pressed="false"><b>B</b></button><button type="button" data-format="italic" aria-label="Italic" aria-pressed="false"><i>I</i></button><button type="button" data-format="underline" aria-label="Underline" aria-pressed="false"><u>U</u></button><span></span><button type="button" id="letterDate">Date stamp</button></nav>
      <section id="letterList" hidden role="dialog" aria-label="Your letters"><div class="letter-stack"><div class="letter-list-top"><h2>Your letters</h2><button type="button" id="letterListClose">Back to paper</button></div><p>Saved on this device. Only a file you choose to export leaves your room.</p><button type="button" id="letterNew">New letter</button><div id="letterRows"></div></div></section>`;
    document.body.appendChild(view);
    const $=s=>view.querySelector(s),body=$('#letterBody'),head=$('#letterHead'),scroll=$('#letterScroll'),list=$('#letterList'),status=$('#letterStatus');
    let active=false,timer=null,lastRange=null,lastFocus=null,lastClack=-Infinity,lastBell=-Infinity,beforeLine=null,composing=false,compositionLine=null;
    function message(text) {status.textContent=text;}
    function safe(action) {try{return action();}catch(e){message(e.message || 'Could not save on this device.');return false;}}
    function flush() {
      clearTimeout(timer);timer=null;if(!active || !model.current)return;
      safe(()=>{model.update({letterhead:head.textContent,body:body.innerHTML});message('Saved');});
    }
    function schedule() {message('Saving…');clearTimeout(timer);timer=setTimeout(flush,250);}
    function load() {
      const l=model.get();head.textContent=l?.letterhead || '';body.innerHTML=sanitizeHTML(l?.body || '');
      head.contentEditable=l?'plaintext-only':'false';body.contentEditable=l?'true':'false';
      $('#letterExport').disabled=!l;view.querySelectorAll('.letter-tools button').forEach(b=>b.disabled=!l);
      lastRange=null;scroll.scrollTop=0;message(l?'Saved':'Start a new letter');
    }
    function remember() {
      if(!active)return;const s=window.getSelection();if(!s.rangeCount)return;const r=s.getRangeAt(0);
      if(body.contains(r.commonAncestorContainer) || head.contains(r.commonAncestorContainer))lastRange=r.cloneRange();
      view.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(body.contains(r.commonAncestorContainer) && document.queryCommandState(b.dataset.format))));
    }
    function restore(bodyOnly=false) {
      const s=window.getSelection();let r=lastRange;
      if(!r || !r.startContainer.isConnected || bodyOnly && !body.contains(r.commonAncestorContainer)) {r=document.createRange();r.selectNodeContents(body);r.collapse(false);}
      (head.contains(r.commonAncestorContainer)?head:body).focus({preventScroll:true});s.removeAllRanges();s.addRange(r);return r;
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
      if(!active)return;const v=window.visualViewport;
      view.style.top=(v?.offsetTop || 0)+'px';view.style.height=(v?.height || window.innerHeight)+'px';requestAnimationFrame(keepCaret);
    }
    function clack() {const t=performance.now();if(t-lastClack>=65){lastClack=t;sound.clack(1,false);}}
    function format(command) {if(!model.current)return;restore(true);document.execCommand('styleWithCSS',false,false);document.execCommand(command,false);remember();schedule();}
    function insert(text,html=false) {restore();document.execCommand(html?'insertHTML':'insertText',false,text);remember();schedule();requestAnimationFrame(keepCaret);}
    function rows() {
      const box=$('#letterRows');box.replaceChildren();
      if(!model.list().length){const p=document.createElement('p');p.textContent='No letters yet. There is plenty of paper.';box.appendChild(p);}
      for(const l of model.list()) {
        const row=document.createElement('div');row.className='letter-row';row.dataset.letter=l.id;
        const title=document.createElement('input');title.value=l.title;title.setAttribute('aria-label','Rename '+l.title);
        title.onchange=()=>safe(()=>{model.rename(l.id,title.value);title.value=model.list().find(x=>x.id===l.id).title;});
        const open=document.createElement('button');open.type='button';open.textContent='Open';open.setAttribute('aria-label','Open '+l.title);
        open.onclick=()=>{flush();safe(()=>model.select(l.id));load();list.hidden=true;body.focus();};
        const del=document.createElement('button');del.type='button';del.textContent='Delete';del.setAttribute('aria-label','Delete '+l.title);
        del.onclick=()=>{if(!del.dataset.confirm){del.dataset.confirm='yes';del.textContent='Delete for good?';return;}flush();safe(()=>model.remove(l.id));load();rows();};
        row.append(title,open,del);box.appendChild(row);
      }
    }
    function showList() {flush();rows();list.hidden=false;$('#letterNew').focus();}
    function close() {if(!active)return;flush();active=false;view.hidden=true;list.hidden=true;onWriting(false);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
    function open() {
      if(active)return;lastFocus=document.activeElement;beforeOpen();active=true;view.hidden=false;list.hidden=true;
      if(!model.current)safe(()=>model.add(roomName()));load();viewport();onWriting(true);sound.clack(1,false);sound.carriageReturn();
      // Opening the paper does not summon the mobile keyboard until the owner taps it.
      $('#letterClose').focus({preventScroll:true});
    }
    $('#letterClose').onclick=close;$('#letterListButton').onclick=showList;$('#letterListClose').onclick=()=>{list.hidden=true;body.focus();};
    $('#letterNew').onclick=()=>{flush();safe(()=>model.add(roomName()));load();list.hidden=true;body.focus();};
    view.querySelectorAll('.letter-tools button').forEach(b=>b.addEventListener('pointerdown',e=>{remember();e.preventDefault();}));
    view.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>format(b.dataset.format));
    $('#letterDate').onclick=()=>{insert(dateStamp(new Date()));clack();};
    $('#letterExport').onclick=async()=>{
      flush();const l=model.get();if(!l)return;const button=$('#letterExport');button.disabled=true;
      try{const result=await saveFile({html:htmlFile(l),filename:`letter-${day(new Date())}.html`});message(result.saved?'File saved': 'Export cancelled');}
      catch(e){message('Could not save the file. Your draft is still here.');}
      finally{button.disabled=!model.current;}
    };
    for(const editor of [head,body]) {
      editor.addEventListener('beforeinput',e=>{
        if(editor===head && /insertParagraph|insertLineBreak/.test(e.inputType)){e.preventDefault();body.focus();return;}
        beforeLine=caretLine();if(/^(insertText|insertCompositionText|deleteCompositionText|insertParagraph|insertLineBreak|deleteContentBackward|deleteContentForward)$/.test(e.inputType))clack();
      });
      editor.addEventListener('input',e=>{
        schedule();remember();const after=caretLine(),t=performance.now();
        if(editor===body && !composing && /^(insertText|insertParagraph|insertLineBreak)$/.test(e.inputType) && beforeLine!==null && after!==null && after>beforeLine+8 && t-lastBell>200){sound.typeBell();lastBell=t;}
        requestAnimationFrame(keepCaret);
      });
      editor.addEventListener('compositionstart',()=>{composing=true;compositionLine=caretLine();});editor.addEventListener('compositionend',()=>{composing=false;clack();schedule();const line=caretLine(),t=performance.now();if(editor===body && compositionLine!==null && line!==null && line>compositionLine+8 && t-lastBell>200){sound.typeBell();lastBell=t;}});
      const paste=e=>{
        e.preventDefault();const data=e.clipboardData || e.dataTransfer;if(!data)return;remember();
        const html=data.getData('text/html'),text=data.getData('text/plain');
        if(editor===head)insert(text);
        else if(html)insert(sanitizeHTML(html),true);else insert(text);
      };
      editor.addEventListener('paste',paste);editor.addEventListener('drop',paste);
      editor.addEventListener('blur',flush);
    }
    document.addEventListener('selectionchange',remember);
    window.addEventListener('keydown',e=>{
      if(!active)return;
      if(e.key==='Tab'){
        const scope=list.hidden?view:list,items=[...scope.querySelectorAll('button:not(:disabled),input,[contenteditable="true"],[contenteditable="plaintext-only"]')].filter(n=>n.getClientRects().length);
        const first=items[0],last=items[items.length-1];
        if(items.length && (e.shiftKey && (document.activeElement===first || !scope.contains(document.activeElement)) || !e.shiftKey && (document.activeElement===last || !scope.contains(document.activeElement)))){e.preventDefault();(e.shiftKey?last:first).focus();}
      }
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!list.hidden){list.hidden=true;body.focus();}else close();return;}
      if(list.hidden && (e.ctrlKey || e.metaKey) && !e.altKey && ['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();format({b:'bold',i:'italic',u:'underline'}[e.key.toLowerCase()]);}
    },true);
    window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});window.addEventListener('pagehide',flush);
    return {open,close,flush,model,view,get active(){return active;}};
  }
  const api={KEY,day,dateStamp,escapeHTML,sanitizeHTML,create,htmlFile,saveFile,createView};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.LRLetters=api;
})(typeof window!=='undefined'?window:globalThis);
