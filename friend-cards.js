// Private invitations. The LR code stays intact; no card data joins a room save.
(function(root){
  const KEY='lr.friendCards',copy=v=>JSON.parse(JSON.stringify(v));
  function create({store,now=Date.now}){
    const list=()=>{const s=store.get(KEY,{cards:[]});return (Array.isArray(s?.cards)?s.cards:[]).filter(c=>c&&typeof c.id==='string'&&typeof c.code==='string').map(copy).sort((a,b)=>b.savedAt-a.savedAt||a.id.localeCompare(b.id));};
    function save(cards){const state={cards};store.set(KEY,state);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(state))throw Error('Could not keep this card on your device. Free a little space and try again.');}
    function receive(code,details){
      code=String(code).trim();if(!/^LR[01]\.[A-Za-z0-9_-]+$/.test(code))throw Error('Not a room code');
      const cards=list(),identity=String(details.identity||code),old=cards.find(c=>c.identity===identity||c.code===code),time=now();
      let id=old?.id||'card-'+time.toString(36);while(!old&&cards.some(c=>c.id===id))id+='x';
      const card={id,code,identity,title:String(details.title||'A friend’s room').slice(0,80),description:String(details.description||'').slice(0,200),n:details.n,items:details.items,savedAt:old?.savedAt??time,updatedAt:time};
      save([card,...cards.filter(c=>c!==old)]);return {card:copy(card),newlySaved:!old};
    }
    return {list,receive,get:id=>list().find(c=>c.id===id)||null,remove(id){const cards=list();save(cards.filter(c=>c.id!==id));}};
  }
  // Original pixel envelope art, rendered locally rather than fetched as an image.
  const ENVELOPE=`<svg viewBox="0 0 96 70" fill="none" shape-rendering="crispEdges" aria-hidden="true"><path d="M4 24H92V66H4Z" fill="#f5eedc" stroke="#635044" stroke-width="3"/><path class="friend-flap" d="M4 24H92L48 49Z" fill="#ece0c7" stroke="#635044" stroke-width="3"/><path d="M5 25L48 51L91 25V65H5Z" fill="#fff8e8"/><path d="M5 65L32 45M91 65L64 45M5 25L48 51L91 25" stroke="#c1b29b" stroke-width="2"/><path d="M4 24V66H92V24" stroke="#635044" stroke-width="3"/><path class="friend-seal" d="M41 36H55V40H59V54H55V58H41V54H37V40H41Z" fill="#c95b43" stroke="#8e392c" stroke-width="2"/><path class="friend-seal" d="M45 43H51V49H45Z" fill="#ef9470"/></svg>`;
  function createView({model,sheet,prepare,visit,thumb=()=>null,sound={},notice=()=>{},scan=()=>()=>{},receiveNote=async()=>{},reduced=()=>false}){
    let revision=0;
    const el=(tag,cls,text)=>{const n=root.document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const button=(parent,label,fn,cls='chipbtn')=>{const b=el('button',cls,label);b.type='button';b.onclick=fn;parent.append(b);return b;};
    const visible=host=>host.isConnected&&!host.closest('[inert]');
    const play=name=>{try{sound[name]?.();}catch(e){/* quiet cards still arrive */}};
    function open(){
      ++revision;
      sheet('Friends’ room cards','Little invitations, kept on this device.',h=>{
        const host=h('div','friend-cards'),intro=el('p','muted small','Keep a friend’s room here without adding it to your home. Your rooms stay yours.');host.append(intro);
        const entry=el('section','friend-code-entry'),form=el('div','friend-code-form');form.id='friendCodeForm';form.hidden=model.list().length>0;
        const toggle=button(entry,'Add a room code',()=>{form.hidden=!form.hidden;toggle.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)ta.focus();});toggle.setAttribute('aria-controls',form.id);toggle.setAttribute('aria-expanded',String(!form.hidden));
        const label=el('label','friend-code-label','Room or guest-book code'),ta=el('textarea','code');ta.rows=3;ta.placeholder='LR1.…';ta.id='friendRoomCode';label.htmlFor=ta.id;
        const actions=el('div','rowbtns');let busy=false;
        const go=button(actions,'Open card',async()=>{
          if(busy)return;busy=true;go.disabled=true;
          if(/^\s*LRG[01]\./.test(ta.value)){try{await receiveNote(ta.value);}catch(e){notice('That note code doesn’t look right');}finally{busy=false;go.disabled=false;}return;}
          let data;try{data=await prepare(ta.value);}catch(e){notice('That room code doesn’t look right');busy=false;go.disabled=false;return;}
          if(!visible(host))return;
          try{const result=model.receive(ta.value,data);show(result.card,result.newlySaved,data);}catch(e){notice(e.message);busy=false;go.disabled=false;}
        },'chipbtn primary');go.id='bOpenCode';
        const camera=button(actions,'Scan with camera',()=>startScan());camera.id='bScanRoom';
        form.append(label,ta,actions);entry.append(form);host.append(entry);
        const archive=el('section','friend-archive');archive.setAttribute('aria-label','Saved room cards');host.append(archive);
        function rows(){archive.replaceChildren();archive.append(el('h3','','Saved cards'));const cards=model.list();if(!cards.length)archive.append(el('p','muted','No cards yet. A little invitation can live here.'));
          for(const card of cards){const row=el('article','friend-saved-row'),icon=el('span','friend-mini');icon.innerHTML=ENVELOPE;const openCard=button(row,'',()=>show(card), 'friend-saved-open');openCard.setAttribute('aria-label','Open '+card.title+' card');const text=el('span','friend-saved-copy');text.append(el('b','',card.title),el('small','',`${card.items} pieces · Saved ${new Date(card.savedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`));openCard.append(icon,text);
            const del=button(row,'×',()=>{if(!del.dataset.confirm){del.dataset.confirm='true';del.textContent='Remove?';return;}try{model.remove(card.id);rows();(archive.querySelector('button')||toggle).focus();}catch(e){notice(e.message);}},'friend-card-remove');del.setAttribute('aria-label','Remove '+card.title+' card');archive.append(row);
          }
        }rows();const startScan=scan({host,onCode:code=>{if(!visible(host))return;ta.value=code;go.click();}});
      });
    }
    function show(card,arriving=false,prepared=null){
      const request=++revision;
      sheet('A room from a friend','An invitation you can open whenever you like.',h=>{
        const host=h('div','friend-card-view'),status=el('p','friend-card-status',arriving?'A little room card is arriving…':'Opening your card…');status.setAttribute('role','status');status.tabIndex=-1;host.append(status);
        const stage=el('div','friend-card-stage'),info=el('article','friend-card-info'),eyebrow=el('p','friend-card-eyebrow','A ROOM INVITATION'),title=el('h3','',card.title),description=el('p','muted',card.description),meta=el('p','friend-card-meta',`${card.n} × ${card.n} room · ${card.items} pieces`);
        info.append(eyebrow,title,description,meta);const envelope=el('div','friend-envelope');envelope.innerHTML=ENVELOPE;stage.append(info,envelope);host.append(stage);
        const actions=el('div','friend-card-actions');host.append(actions);const go=button(actions,'Visit this room',()=>{if(data)visit(data);},'chipbtn primary friend-card-visit');go.disabled=true;button(actions,'Saved cards',open);let data=null;
        status.focus({preventScroll:true});
        const ready=async()=>{
          try{data=prepared||await prepare(card.code);if(request!==revision||!visible(host))return;
            title.textContent=data.title;description.textContent=data.description;meta.textContent=`${data.n} × ${data.n} room · ${data.items} pieces`;
            try{const src=thumb(data.room);if(src){const image=el('img','friend-room-preview');image.src=src;image.alt='';info.insertBefore(image,title);}}catch(e){/* The invitation works without a preview. */}
            const animate=arriving&&!reduced();if(animate){stage.classList.add('is-arriving');info.setAttribute('aria-hidden','true');host.setAttribute('aria-busy','true');play('plop');setTimeout(()=>{if(visible(host))play('flip');},500);}else play('flip');
            const finish=()=>{if(request!==revision||!visible(host))return;stage.classList.remove('is-arriving');info.removeAttribute('aria-hidden');host.removeAttribute('aria-busy');go.disabled=false;status.textContent='Saved on this device. Ready when you are.';if(root.document.activeElement===status)go.focus({preventScroll:true});};
            if(animate)setTimeout(finish,1200);else finish();
          }catch(e){if(request===revision&&visible(host)){status.textContent='This card couldn’t be opened. Try pasting the code again.';notice('That saved room code couldn’t be opened');}}
        };Promise.resolve().then(ready);
      });
    }
    return {open,show};
  }
  const api={KEY,create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRFriendCards=api;
})(typeof window!=='undefined'?window:globalThis);
