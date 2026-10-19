// Furniture-sized, local tools. One private device state, never room item fields.
(function(root){
  const Pixel=typeof module!=='undefined'&&module.exports?require('./pixel-maker.js'):root.LRPixelMaker;
  const Postcard=typeof module!=='undefined'&&module.exports?require('./mail-window.js'):root.LRMailWindow;
  const KEY='lr.tools',day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);return day(new Date(y,m-1,d))===s;}
  function cents(value){
    const s=String(value).trim().replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Use an amount with at most two decimal places.');
    const [whole,fraction='']=s.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
    if(!Number.isSafeInteger(n)||n<=0)throw Error('Use a positive amount.');return n;
  }
  const amount=n=>(n/100).toFixed(2);
  // The mailbox compose window's starting header, before any edit or saved draft.
  const MAIL_DEFAULTS={from:'crisdalessio@gmail.com',to:'Future me',subject:'A note for future me'};
  const clip=(v,n)=>String(v??'').slice(0,n);
  const TALLY_GOAL=50;
  const TEA_PRESETS=[{name:'Green tea',minutes:2},{name:'Black tea',minutes:3},{name:'Herbal',minutes:5}];
  // Clockwise from twelve o'clock: 1 at 36 degrees, 10 at the top.
  function dialMinutes(x,y){const turn=(Math.atan2(x,-y)+Math.PI*2)%(Math.PI*2);return Math.round(turn/(Math.PI*2)*10)||10;}
  function teaDisplay(t,remaining,selected=3){
    const state=t?.status || 'idle',minutes=state==='brewing'||state==='ready'?t.minutes:selected;
    return {state,minutes,preset:TEA_PRESETS.find(p=>p.minutes===minutes)?.name || `${minutes} min steep`,
      progress:state==='ready'?1:state==='brewing'?Math.max(0,Math.min(1,1-remaining/(t.minutes*60000))):0,
      label:state==='brewing'?'Cancel steep':state==='ready'?'Enjoy the tea':'Brew tea',
      mascot:state==='ready'?'happy':state==='brewing'?'watching':'calm',
      readout:state==='ready'?'Ready':state==='brewing'?`${Math.floor(Math.ceil(remaining/1000)/60)}:${String(Math.ceil(remaining/1000)%60).padStart(2,'0')}`:`${minutes} MIN${minutes===1?'':'S'}`,
      note:state==='ready'?'Your tea is ready.':state==='brewing'?'A quiet moment to steep.':'Make a little time for tea.'};
  }

  function create({store,now=()=>new Date(),random=Math.random,onBrew=()=>{},onTallyGoal=()=>{}}){
    const old=store.get(KEY,{})||{},copy=a=>JSON.parse(JSON.stringify(a));
    const state={v:1,next:Number.isSafeInteger(old.next)&&old.next>0?old.next:1,
      mail:Array.isArray(old.mail)?old.mail:[],groceries:Array.isArray(old.groceries)?old.groceries:[],ideas:Array.isArray(old.ideas)?old.ideas:[],
      // Tally lives inside lr.tools, never a separate lr.tally storage key.
      tally:old.tally&&validDate(old.tally.date)?{date:old.tally.date,count:Number.isSafeInteger(old.tally.count)&&old.tally.count>=0?old.tally.count:0,completed:!!old.tally.completed||(Number.isSafeInteger(old.tally.count)&&old.tally.count>=TALLY_GOAL)}:null,
      lastIdea:old.lastIdea||null,tea:old.tea||null,mailFrom:typeof old.mailFrom==='string'?old.mailFrom:null,mailDraft:old.mailDraft&&typeof old.mailDraft==='object'?old.mailDraft:null,goal:old.goal||null,deposits:Array.isArray(old.deposits)?old.deposits:[],pixel:Pixel.normalize(old.pixel),pixelPosters:old.pixelPosters&&typeof old.pixelPosters==='object'?old.pixelPosters:{}};
    const save=()=>{store.set(KEY,state);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(state))throw Error('Could not save on this device.');};
    const id=prefix=>prefix+'-'+now().getTime().toString(36)+'-'+state.next++;
    function tally(){const date=day(now());if(!state.tally||state.tally.date!==date){const before=state.tally;state.tally={date,count:0,completed:false};try{save();}catch(e){state.tally=before;throw e;}}return copy(state.tally);}
    function countRep(delta=1){
      if(delta!==1&&delta!==-1)throw Error('Count one rep at a time.');
      const before=tally(),count=Math.max(0,before.count+delta);if(!Number.isSafeInteger(count))throw Error('This counter is full.');if(count===before.count)return copy(before);
      // Undo corrects reps; the day's earned milestone stays once-only across reloads.
      const hit=!before.completed&&count>=TALLY_GOAL;state.tally={date:before.date,count,completed:before.completed||hit};try{save();}catch(e){state.tally=before;throw e;}
      if(hit)onTallyGoal(copy(state.tally));return copy(state.tally);
    }
    function send({title,body,html='',letterhead='',deliverOn,from,to,cardIcon}){
      if(!validDate(deliverOn)||deliverOn<=day(now()))throw Error('Choose a future date.');
      if(!String(body||'').trim())throw Error('Put a little something in the envelope.');
      const letter={id:id('mail'),title:String(title||'').trim()||MAIL_DEFAULTS.subject,body:String(body||''),html:String(html),letterhead:String(letterhead),cardIcon:Postcard.normalizeIcon(cardIcon),deliverOn,
        from:clip(String(from??'').trim()||MAIL_DEFAULTS.from,120),to:clip(String(to??'').trim()||MAIL_DEFAULTS.to,120),status:'sealed',read:false,notified:false,createdAt:now().getTime()};
      state.mail.unshift(letter);state.mailFrom=letter.from;state.mailDraft=null;save();return copy(letter);   // sending clears the draft, keeps the sender
    }
    // The compose window: a saved draft, and the sender remembered between letters.
    function saveDraft(d){state.mailDraft={from:clip(d?.from,120),to:clip(d?.to,120),subject:clip(d?.subject,200),body:clip(d?.body,20000),deliverOn:clip(d?.deliverOn,10),cardIcon:Postcard.normalizeIcon(d?.cardIcon),savedAt:now().getTime()};save();return copy(state.mailDraft);}
    function clearDraft(){if(state.mailDraft){state.mailDraft=null;save();}}
    function setFrom(v){const from=clip(String(v??'').trim(),120);if(from===(state.mailFrom??MAIL_DEFAULTS.from))return;state.mailFrom=from||null;save();}
    function compose(){const d=state.mailDraft,date=new Date(now());date.setDate(date.getDate()+7);
      return {from:d?d.from:state.mailFrom??MAIL_DEFAULTS.from,to:d?d.to:MAIL_DEFAULTS.to,subject:d?d.subject:MAIL_DEFAULTS.subject,body:d?d.body:'',deliverOn:d&&validDate(d.deliverOn)&&d.deliverOn>day(now())?d.deliverOn:day(date),cardIcon:Postcard.normalizeIcon(d?.cardIcon),draft:!!d};}
    function poll(notices=true){
      if(state.tally&&state.tally.date!==day(now()))tally();
      let changed=false;const events={mail:[],tea:false},date=day(now()),time=now().getTime();
      for(const l of state.mail){
        if(l.status==='sealed'&&l.deliverOn<=date){l.status='arrived';changed=true;}
        if(notices&&l.status==='arrived'&&!l.notified&&!l.read){l.notified=true;events.mail.push(l.id);changed=true;}
      }
      const t=state.tea;if(t&&t.status==='brewing'&&time>=t.endAt){t.status='ready';changed=true;}
      if(notices&&t?.status==='ready'&&!t.notified){t.notified=true;events.tea=true;changed=true;}
      if(changed)save();return events;
    }
    function read(id){poll(false);const l=state.mail.find(l=>l.id===id);if(!l||l.status!=='arrived')return null;l.read=true;l.notified=true;save();return copy(l);}
    function remove(collection,id){const a=state[collection];if(!['mail','groceries','ideas','deposits'].includes(collection)||!a.some(x=>x.id===id))return false;state[collection]=a.filter(x=>x.id!==id);save();return true;}
    function addGrocery(text){text=String(text).trim();if(!text)throw Error('What do you need from the shop?');state.groceries.push({id:id('grocery'),text,done:false});save();}
    function checkGrocery(id,done){const g=state.groceries.find(g=>g.id===id);if(g){g.done=!!done;save();}}
    function clearGroceries(){state.groceries=state.groceries.filter(g=>!g.done);save();}
    function addIdea(text){text=String(text).trim();if(!text)throw Error('Drop in a little idea first.');state.ideas.unshift({id:id('idea'),text,createdAt:now().getTime()});save();}
    function shake(){const pool=state.ideas.filter(i=>state.ideas.length===1||i.id!==state.lastIdea);if(!pool.length)return null;const i=pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))];state.lastIdea=i.id;save();return copy(i);}
    function brew(minutes){if(!Number.isInteger(minutes)||minutes<1||minutes>30)throw Error('Choose between 1 and 30 minutes.');state.tea={minutes,endAt:now().getTime()+minutes*60000,status:'brewing',notified:false};save();onBrew(copy(state.tea));}
    function cancelTea(){state.tea=null;save();}
    function enjoyTea(){if(state.tea){state.tea.status='done';state.tea.notified=true;save();}}
    const total=()=>state.deposits.reduce((n,d)=>n+d.cents,0);
    function goal(title,target){title=String(title).trim();if(!title)throw Error('Give your goal a name.');state.goal={title,target:cents(target)};save();}
    function deposit(value,note=''){if(!state.goal)throw Error('Set a goal first.');const n=cents(value);if(!Number.isSafeInteger(total()+n))throw Error('That total is too large for this jar.');state.deposits.unshift({id:id('deposit'),cents:n,note:String(note).trim(),date:day(now())});save();}
    if('strokes' in old)save(); // Retire the private freehand format; pixel sketches start fresh.
    const pixels=Pixel.create({read:()=>state.pixel,write:g=>{const before=state.pixel;state.pixel=g;try{save();}catch(e){state.pixel=before;throw e;}}});
    return {get tally(){return tally();},countRep,send,saveDraft,clearDraft,setFrom,compose,get mailDraft(){return state.mailDraft?copy(state.mailDraft):null;},poll,read,remove,addGrocery,checkGrocery,clearGroceries,addIdea,shake,brew,cancelTea,enjoyTea,goal,deposit,pixels,pinPixel(room,id,grid){state.pixelPosters[`${room}:${id}`]=Pixel.normalize(grid);save();},pixelPoster(room,id){const g=state.pixelPosters[`${room}:${id}`];return g?Pixel.normalize(g):null;},total,
      get homeState(){return {tea:state.tea?copy(state.tea):null,mail:state.mail.map(l=>({id:l.id,status:l.status,deliverOn:l.deliverOn,read:l.read})),ideas:copy(state.ideas)};},get state(){return copy(state);},get tea(){return state.tea?copy(state.tea):null;},get visual(){return {unread:state.mail.some(l=>l.status==='arrived'&&!l.read),ideas:state.ideas.length,level:state.goal?Math.min(8,Math.ceil(total()/state.goal.target*8)):0};},get remaining(){return state.tea?.status==='brewing'?Math.max(0,state.tea.endAt-now().getTime()):0;}};
  }
  // Presentation order only. The model's newest-first list and lastIdea are untouched.
  function ideaCards(ideas,frontId){const index=Math.max(0,ideas.findIndex(i=>i.id===frontId)),top=ideas[index] || null;return {top,count:ideas.length,index, next:ideas.length?ideas[(index+1)%ideas.length]:null,behind:Array.from({length:Math.min(3,Math.max(0,ideas.length-1))},(_,i)=>ideas[(index+i+1)%ideas.length])};}
  function ideaAdded(idea){const date=new Date(idea?.createdAt);if(!Number.isFinite(date.getTime()))return 'Kept in your jar';const parts=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'long'}).formatToParts(date);return `Added ${parts.find(p=>p.type==='day').value} ${parts.find(p=>p.type==='month').value}`;}
  function kind(it,C){return C.privateTool || (it.t==='minifridge'||C.tap==='door'&&/fridge|icebox|refrigerator/i.test(C.name)?'groceries':it.t==='kettle'?'tea':it.t==='mailbox'?'mailbox':null);}
  function createView({model,sheet,renderer,room,editing,hidden,letters,onBrew=()=>{},onPhotos=()=>{},sound,notice=()=>{},portrait=()=>null,portraitKey=()=>'',music=()=>false,toggleMusic=()=>{},hangPixel=()=>{}}){
    let active=null,anchor=null,resize=null,canvas=null,status=null,frameTime=0;
    let teaMinutes=3;
    const badges=new Map(),button=(parent,label,fn,cls='chipbtn')=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=()=>run(fn);parent.appendChild(b);return b;};
    function run(fn){try{const result=fn();if(status)status.textContent='';return result;}catch(e){if(status)status.textContent=e.message || 'Could not save on this device.';return false;}}
    function field(parent,label,type='text',value=''){
      const l=document.createElement('label');l.className='roomtool-field';const s=document.createElement('span');s.textContent=label;
      const input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.setAttribute('aria-label',label);l.append(s,input);parent.appendChild(l);return input;
    }
    function text(parent,value,cls=''){const p=document.createElement('p');p.className=cls;p.textContent=value;parent.appendChild(p);return p;}
    // Delete actions use the same two-tap pattern as the private letter stack.
    function removeButton(parent,fn){let confirmed=false;const b=button(parent,'Delete',()=>{if(!confirmed){confirmed=true;b.textContent='Delete for good?';}else fn();});return b;}
    function close(){flushStroke();resize?.disconnect();resize=null;canvas=null;status=null;active=null;}
    function shell(title,sub,build){
      close();sheet(LRLetters.escapeHTML(title),LRLetters.escapeHTML(sub),h=>{const root=h('div','roomtool');root.dataset.roomTool='true';status=document.createElement('p');status.className='roomtool-status muted';status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.appendChild(status);active=root;build(root);});
    }
    function open(tool,id=anchor){anchor=id;
      if(tool==='mailbox')mailbox();else if(tool==='groceries')groceries();else if(tool==='ideas')ideas();else if(tool==='tea')tea();else if(tool==='savings')savings();else if(tool==='sketch')sketch();else if(tool==='tally')tally();
    }
    // The same pixel email window the typewriter writes in. Rich text stays off here.
    let pendingSeal=null;
    function plainLetter(html){
      const template=document.createElement('template');
      template.innerHTML=LRLetters.sanitizeHTML(html).replace(/<br\s*\/?>/gi,'\n').replace(/<\/(?:p|div)>/gi,'\n');
      return template.content.textContent.replace(/\n{3,}/g,'\n\n').replace(/^\n+|\n+$/g,'');
    }
    function applyTypewriter(ui,snapshot){
      ui.body.value=plainLetter(snapshot.body);ui.body.readOnly=true;ui.fields.Subject.value=snapshot.title;
      if(snapshot.from)ui.fields.From.value=snapshot.from;if(snapshot.to)ui.fields.To.value=snapshot.to;ui.postcard.set(snapshot.cardIcon);
      if(!ui.foot.querySelector('.mailwin-hint'))text(ui.foot,'Typewriter formatting will travel inside this envelope.','mailwin-hint');
      return snapshot;
    }
    function seal(letter){pendingSeal=letter?{...letter}:null;mailbox();const due=active?.querySelector('input[type=date]');due?.focus();try{due?.showPicker();}catch(e){/* the date row is open either way */}}
    function mailbox(){
      const sealed=pendingSeal;pendingSeal=null;
      model.poll(false);shell('Letters to future you','A little time capsule, private to this device. It arrives on its date when you next visit your room.',root=>{
        const c=model.compose(),tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
        const ui=LRMailWindow.create({postcard:true,cardIcon:sealed?.cardIcon||c.cardIcon,title:'Email',icon:'envelope',label:'Compose a letter to future you',from:sealed?.from||c.from,to:sealed?.to||c.to,subject:sealed?.title||c.subject,body:sealed?'':c.body,placeholder:'Hey future me!',richText:false,deliverOn:{value:c.deliverOn,min:day(tomorrow)},status:c.draft&&!sealed?'Draft restored':'',buttons:[{label:'Save draft'},{label:'Send',className:'mailwin-send'}]});
        root.appendChild(ui.form);
        const {form:win,body,due,saved,foot}=ui,from=ui.fields.From,to=ui.fields.To,title=ui.fields.Subject;
        from.addEventListener('change',()=>run(()=>model.setFrom(from.value)));   // the sender is remembered even without a draft
        const snapshot=sealed?applyTypewriter(ui,sealed):null;
        const state=()=>({from:from.value,to:to.value,subject:title.value,body:body.value,cardIcon:ui.postcard.icon,deliverOn:due.value});
        ui.buttons['Save draft'].onclick=()=>run(()=>{model.saveDraft(state());model.setFrom(from.value);const t=new Date();saved.textContent=`Draft saved ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;});
        ui.buttons.Send.onclick=()=>run(()=>{if(!win.reportValidity())return;model.send({title:title.value,body:body.value,html:snapshot?LRLetters.sanitizeHTML(snapshot.body):'',letterhead:snapshot?.letterhead||'',deliverOn:due.value,from:from.value,to:to.value,cardIcon:ui.postcard.icon});sound.rustle();mailbox();});
        if(model.state.mail.length){const h=document.createElement('p');h.className='mailwin-listhead';h.textContent='Your envelopes';root.appendChild(h);}
        for(const l of model.state.mail){
          const row=document.createElement('section');row.className='roomtool-card mailwin-letter';row.dataset.mail=l.id;row.dataset.mailStatus=l.status;root.appendChild(row);text(row,l.title,'roomtool-title');
          text(row,l.status==='sealed'?`Sealed until ${l.deliverOn}`:l.read?`Opened · ${l.deliverOn}`:`Arrived · ${l.deliverOn}`,'muted');
          if(l.status==='arrived')button(row,'Read letter',()=>{const letter=model.read(l.id);if(letter)readMail(letter);});
          removeButton(row,()=>{model.remove('mail',l.id);mailbox();});
        }
      });
    }
    function readMail(l){shell(l.title,l.letterhead || `A note from your past self · ${l.deliverOn}`,root=>{
      root.appendChild(LRMailWindow.readCard(l,LRLetters.sanitizeHTML));button(root,'Back to mailbox',mailbox);
    });}
    function groceries(){shell('On the fridge door','Your grocery list, private to this device.',root=>{
      const notebook=document.createElement('section');notebook.className='grocery-notebook';notebook.setAttribute('aria-label','Grocery notebook');root.appendChild(notebook);
      const title=document.createElement('h3');title.textContent='Groceries';notebook.appendChild(title);
      const items=document.createElement('div');items.className='grocery-items';notebook.appendChild(items);

      for(const g of model.state.groceries){
        const row=document.createElement('div');row.className='grocery-row'+(g.done?' done':'');const label=document.createElement('label'),check=document.createElement('input'),name=document.createElement('span'),mark=document.createElement('span');
        check.type='checkbox';check.checked=g.done;check.setAttribute('aria-label',g.text);name.className='grocery-name';name.textContent=g.text;mark.className='grocery-check';mark.setAttribute('aria-hidden','true');mark.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 6"/></svg>';
        label.append(check,mark,name);row.appendChild(label);check.onchange=()=>run(()=>{model.checkGrocery(g.id,check.checked);row.classList.toggle('done',check.checked);});const remove=button(row,'×',()=>{model.remove('groceries',g.id);groceries();},'grocery-remove');remove.setAttribute('aria-label','Remove grocery: '+g.text);items.appendChild(row);
      }
      if(!model.state.groceries.length)text(items,'🧺 Nothing on the list yet. A little space for what you need.','grocery-empty');
      const form=document.createElement('form');form.className='grocery-add';notebook.appendChild(form);const input=field(form,'Add groceries');input.autocomplete='off';input.placeholder='Something for the basket…';
      const add=()=>{model.addGrocery(input.value);groceries();active.querySelector('input:not([type=checkbox])').focus();};form.onsubmit=e=>{e.preventDefault();run(add);};button(form,'Add to list',add,'grocery-add-button');
      button(root,'Clear checked items',()=>{model.clearGroceries();groceries();});if(room().get(anchor)?.t==='minifridge')button(root,'Photo magnets',()=>onPhotos(anchor));
    });}
    function tally(){shell('Pushup tally','One rep at a time. Just yours, on this device.',root=>{
      root.classList.add('pushup-tally');text(root,'Creatine 5g · 50 pushups a day','muted small tally-habit');
      const tap=button(root,'',()=>{model.countRep(1);updateTally();try{sound.click(true);}catch(e){/* optional mechanical sound */}},'tally-clicker');tap.setAttribute('aria-label','Add one pushup');
      const count=document.createElement('output');count.className='tally-count';count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');tap.append(count);const plus=document.createElement('span');plus.className='tally-plus';plus.textContent='+1';tap.appendChild(plus);
      const progress=text(root,'','tally-progress');progress.setAttribute('aria-live','polite');const bar=document.createElement('progress');bar.className='tally-bar';bar.max=TALLY_GOAL;bar.setAttribute('aria-label','Daily pushup progress');root.appendChild(bar);
      const undo=button(root,'−1 · Undo',()=>{model.countRep(-1);updateTally();},'chipbtn tally-undo');undo.setAttribute('aria-label','Undo one pushup');text(root,'','tally-note muted');updateTally();
    });}
    function updateTally(){if(!active?.classList.contains('pushup-tally'))return;const data=model.tally;active.querySelector('.tally-count').textContent=String(data.count);active.querySelector('.tally-progress').textContent=`${data.count} / ${TALLY_GOAL}`;active.querySelector('.tally-bar').value=Math.min(TALLY_GOAL,data.count);active.querySelector('.tally-undo').disabled=data.count===0;active.querySelector('.tally-note').textContent=data.count>=TALLY_GOAL?'Daily 50 reached. Nicely done.':'Every rep belongs here.';}
    function ideas(){shell('The idea jar','Drop in a thought. Shake for a spark. All yours, on this device.',root=>{
      root.classList.add('idea-jar');let frontId=null,reason='latest';
      const count=document.createElement('small');count.className='idea-count';root.parentElement.querySelector(':scope > h2')?.appendChild(count);
      const stack=document.createElement('div');stack.className='idea-stack';root.appendChild(stack);
      const position=text(root,'','idea-position muted small');position.setAttribute('role','status');
      const actions=document.createElement('div');actions.className='idea-actions';root.appendChild(actions);
      const shake=button(actions,'Shake the jar',()=>{const idea=model.shake();if(!idea)return;frontId=idea.id;reason='shaken';draw('is-shaken');const v=renderer();if(anchor&&v.objs.has(anchor)){v.excite(anchor);v.burst(anchor,'magic',.8);}sound.rustle();},'chipbtn idea-shake');
      const drop=button(actions,'Drop in an idea',()=>{form.hidden=!form.hidden;drop.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)input.focus();},'chipbtn');drop.setAttribute('aria-expanded','false');drop.setAttribute('aria-controls','ideaDropForm');
      const form=document.createElement('form');form.id='ideaDropForm';form.className='idea-drop-form';form.hidden=true;root.appendChild(form);const input=field(form,'A little idea','textarea');input.rows=3;input.placeholder='Something worth keeping…';input.required=true;
      const submit=button(form,'Drop in jar',()=>{});submit.type='submit';button(form,'Not now',()=>{form.hidden=true;drop.setAttribute('aria-expanded','false');drop.focus();});
      form.onsubmit=e=>{e.preventDefault();run(()=>{model.addIdea(input.value);frontId=model.state.ideas[0].id;reason='latest';sound.plop();input.value='';form.hidden=true;drop.setAttribute('aria-expanded','false');draw('is-dropped');stack.querySelector('.idea-cycle')?.focus({preventScroll:true});});};
      const reveal=()=>{form.hidden=false;drop.setAttribute('aria-expanded','true');input.focus();};
      function draw(animation=''){
        const cards=ideaCards(model.state.ideas,frontId);frontId=cards.top?.id || null;stack.replaceChildren();count.textContent=` · ${cards.count} spark${cards.count===1?'':'s'}`;shake.disabled=!cards.count;position.textContent=cards.count?`${cards.index+1} of ${cards.count} spark${cards.count===1?'':'s'} · Tap the card to browse`:'A little room for your next idea.';
        for(let i=cards.behind.length-1;i>=0;i--){const back=document.createElement('div');back.className='idea-back idea-back-'+i;back.setAttribute('aria-hidden','true');text(back,'A LITTLE SPARK','idea-card-label');text(back,cards.behind[i].text,'idea-back-text');stack.appendChild(back);}
        const front=document.createElement('article');front.className='idea-front '+animation;stack.appendChild(front);
        if(!cards.top){const invite=button(front,'The jar is empty. Drop in your first spark.',reveal,'idea-cycle idea-invite');invite.setAttribute('aria-label','The jar is empty. Drop in your first spark.');return;}
        front.dataset.idea=cards.top.id;
        const cycle=button(front,'',()=>{frontId=ideaCards(model.state.ideas,frontId).next.id;reason='browse';draw('is-cycled');stack.querySelector('.idea-cycle')?.focus({preventScroll:true});},'idea-cycle');cycle.setAttribute('aria-label','Next idea');cycle.setAttribute('aria-describedby','ideaCardText');
        const label=document.createElement('span');label.className='idea-card-label';label.textContent=reason==='shaken'?'LAST SHAKEN':cards.top.id===model.state.ideas[0]?.id?'LATEST DROP':'SAVED SPARK';
        const body=document.createElement('span');body.className='idea-card-text';body.id='ideaCardText';body.textContent=cards.top.text;
        const date=document.createElement('small');date.className='idea-card-date';date.textContent=ideaAdded(cards.top);cycle.append(label,body,date);
        const remove=button(front,'×',()=>{const next=ideaCards(model.state.ideas,frontId).next;model.remove('ideas',frontId);frontId=next?.id;reason='browse';draw();stack.querySelector('.idea-cycle')?.focus({preventScroll:true});},'idea-remove');remove.setAttribute('aria-label','Remove idea');remove.title='Remove this idea';
      }
      draw();
    });}
    function tea(){model.poll(false);const saved=model.tea;if(saved?.minutes>=1&&saved.minutes<=10)teaMinutes=saved.minutes;shell('Tea','A quiet real-time steep. You can close this sheet and leave the room.',root=>{
      root.classList.add('tea-focus');const heading=root.parentElement.querySelector(':scope > h2'),description=root.previousElementSibling;if(description?.matches('p.muted'))description.remove();
      const svg=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
      const top=document.createElement('div');top.className='tea-top';root.appendChild(top);
      const tune=button(top,'♫ Tune in',()=>{toggleMusic();updateClock();},'tea-pill');tune.dataset.teaMusic='true';
      const preset=text(top,'','tea-pill tea-current');preset.dataset.teaPreset='true';if(heading){heading.classList.add('tea-heading');root.appendChild(heading);}
      const dial=document.createElement('div');dial.className='tea-dial';root.appendChild(dial);
      const ring=svg('svg',{viewBox:'0 0 320 320','aria-hidden':'true'}),radius=110,circumference=2*Math.PI*radius;
      ring.appendChild(svg('circle',{cx:160,cy:160,r:radius,class:'tea-dial-track'}));
      const arc=svg('circle',{cx:160,cy:160,r:radius,class:'tea-dial-progress',transform:'rotate(-90 160 160)','stroke-dasharray':circumference,'stroke-dashoffset':circumference});arc.dataset.teaArc='true';ring.appendChild(arc);
      for(let i=0;i<50;i++){const a=i/50*Math.PI*2,r=i%5===0?144:148;ring.appendChild(svg('line',{x1:160+Math.sin(a)*r,y1:160-Math.cos(a)*r,x2:160+Math.sin(a)*153,y2:160-Math.cos(a)*153,class:i%5===0?'tea-tick major':'tea-tick'}));}
      for(let i=1;i<=10;i++){const a=i/10*Math.PI*2,n=svg('text',{x:160+Math.sin(a)*130,y:160-Math.cos(a)*130,'text-anchor':'middle','dominant-baseline':'central',class:'tea-minute'});n.textContent=i;n.dataset.minute=i;ring.appendChild(n);}
      const hand=svg('circle',{r:7,class:'tea-dial-handle'});hand.dataset.teaHandle='true';ring.appendChild(hand);dial.appendChild(ring);
      const timer=text(dial,'','roomtool-timer tea-readout');timer.dataset.teaClock='true';timer.setAttribute('role','timer');
      const slider=document.createElement('input');slider.type='range';slider.min='1';slider.max='10';slider.step='1';slider.className='tea-dial-input';slider.setAttribute('aria-label','Tea steep length');dial.appendChild(slider);
      const select=n=>{teaMinutes=Math.max(1,Math.min(10,Math.round(n)));updateClock();};slider.oninput=()=>select(Number(slider.value));
      let pointer=null;const point=e=>{const b=dial.getBoundingClientRect();select(dialMinutes(e.clientX-b.left-b.width/2,e.clientY-b.top-b.height/2));};
      dial.onpointerdown=e=>{if(slider.disabled||e.button!==0)return;e.preventDefault();pointer=e.pointerId;slider.focus({preventScroll:true});dial.setPointerCapture(pointer);point(e);};dial.onpointermove=e=>{if(e.pointerId===pointer)point(e);};dial.onpointerup=dial.onpointercancel=()=>{pointer=null;};
      const presets=document.createElement('div');presets.className='tea-presets';root.appendChild(presets);for(const p of TEA_PRESETS){const b=button(presets,`${p.name} · ${p.minutes} min`,()=>select(p.minutes),'tea-pill');b.dataset.teaMinutes=p.minutes;}
      const note=text(root,'','tea-note');note.dataset.teaNote='true';
      const actions=document.createElement('div');actions.className='tea-actions';root.appendChild(actions);
      const start=button(actions,'',()=>{const t=model.tea;if(t?.status==='brewing')model.cancelTea();else if(t?.status==='ready'){model.enjoyTea();sound.sip();}else{model.brew(teaMinutes);onBrew(anchor);}updateClock();},'tea-start');start.dataset.teaAction='true';
      const steam=document.createElement('div');steam.className='tea-steam';steam.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)steam.appendChild(document.createElement('i'));dial.appendChild(steam);
      const mascot=document.createElement('div');mascot.className='tea-mascot';const image=document.createElement('img');image.alt='Your little roommate';image.width=100;image.height=100;mascot.appendChild(image);actions.appendChild(mascot);text(root,'Your tea keeps steeping with this sheet closed.','tea-footnote muted small');
      updateClock();
    });}
    function updateClock(){if(!active?.isConnected)return;const el=active.querySelector('[data-tea-clock]');if(!el)return;
      const d=teaDisplay(model.tea,model.remaining,teaMinutes),running=d.state==='brewing',locked=running||d.state==='ready';active.dataset.teaState=d.state;
      el.textContent=d.readout;el.setAttribute('aria-label',running?d.readout+' remaining':d.state==='ready'?d.note:d.readout);
      active.querySelector('[data-tea-preset]').textContent=d.preset;
      const slider=active.querySelector('.tea-dial-input');slider.value=Math.min(10,d.minutes);slider.disabled=locked;slider.setAttribute('aria-valuetext',`${d.minutes} minutes`);
      const angle=d.minutes/10*Math.PI*2,hand=active.querySelector('[data-tea-handle]');hand.setAttribute('cx',160+Math.sin(angle)*110);hand.setAttribute('cy',160-Math.cos(angle)*110);hand.style.display=locked?'none':'';
      const arc=active.querySelector('[data-tea-arc]');arc.setAttribute('stroke-dashoffset',2*Math.PI*110*(1-d.progress));arc.dataset.progress=d.progress;
      active.querySelectorAll('[data-tea-minutes]').forEach(b=>{b.disabled=locked;b.setAttribute('aria-pressed',String(Number(b.dataset.teaMinutes)===d.minutes));});
      active.querySelectorAll('.tea-minute').forEach(n=>n.classList.toggle('selected',Number(n.dataset.minute)===d.minutes));
      const action=active.querySelector('[data-tea-action]');action.setAttribute('aria-label',d.label);action.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">'+(running?'<rect x="6" y="6" width="12" height="12" rx="2"/>':d.state==='ready'?'<path d="M5 11h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 12h2a2 2 0 0 1 0 4h-2M8 4v3M12 4v3"/>':'<path d="M7 4l13 8-13 8z"/>')+'</svg><span>'+d.label+'</span>';
      active.querySelector('[data-tea-note]').textContent=d.note;const tune=active.querySelector('[data-tea-music]');tune.setAttribute('aria-pressed',String(music()));
      const mascot=active.querySelector('.tea-mascot'),image=mascot.querySelector('img'),key=portraitKey()+':'+d.mascot;mascot.dataset.state=d.mascot;
      if(mascot.dataset.key!==key){mascot.dataset.key=key;const src=portrait(d.mascot);image.hidden=!src;if(src)image.src=src;image.alt=d.mascot==='happy'?'Your little roommate is happy the tea is ready':d.mascot==='watching'?'Your little roommate watches the tea steep':'Your little roommate keeps you company';}
    }
    function savings(){shell('A little savings jar','A private record of what you have set aside.',root=>{
      const data=model.state,goal=field(root,'Goal name','text',data.goal?.title||''),target=field(root,'Target amount','text',data.goal?amount(data.goal.target):'');target.inputMode='decimal';
      button(root,'Save goal',()=>{model.goal(goal.value,target.value);savings();});
      if(!data.goal)return;const total=model.total();text(root,`${amount(total)} of ${amount(data.goal.target)} · ${data.goal.title}`,'roomtool-title');
      const progress=document.createElement('progress');progress.max=data.goal.target;progress.value=Math.min(total,data.goal.target);progress.setAttribute('aria-label','Savings progress');root.appendChild(progress);
      if(total>=data.goal.target)text(root,'You made room for your goal. Lovely.');
      const value=field(root,'Deposit amount');value.inputMode='decimal';const note=field(root,'Deposit note');button(root,'Log deposit',()=>{model.deposit(value.value,note.value);sound.coin();savings();});
      for(const d of data.deposits){const row=document.createElement('div');row.className='roomtool-card';text(row,`${amount(d.cents)} · ${d.date}${d.note?' · '+d.note:''}`);removeButton(row,()=>{model.remove('deposits',d.id);savings();});root.appendChild(row);}
    });}
    function flushStroke(){model.pixels.end();}
    function sketch(){shell('Pixel maker','Draw a little pixel picture. Kept on this device, outside room shares.',root=>{
      const ui=Pixel.createView({model:model.pixels,host:root,notice:message=>{status.textContent=message;},hang:hangPixel,reduced:()=>renderer().reducedMotion});
      resize=new ResizeObserver(()=>ui.resize());resize.observe(ui.canvas);canvas=ui.canvas;
    });}
    function tick(allowed){
      const events=model.poll(allowed);if(events.mail.length)notice(`${events.mail.length===1?'A letter from your past self has':'Letters from your past self have'} arrived.`);
      if(events.tea){sound.ritualChime();notice('Your tea is ready. Take a little pause.');}
      if(active?.isConnected)for(const l of model.state.mail){const row=[...active.querySelectorAll('[data-mail]')].find(r=>r.dataset.mail===l.id);if(row&&l.status==='arrived'&&row.dataset.mailStatus!=='arrived'){row.dataset.mailStatus='arrived';row.querySelector('.muted').textContent=`Arrived · ${l.deliverOn}`;button(row,'Read letter',()=>{const letter=model.read(l.id);if(letter)readMail(letter);});}}
      updateClock();updateTally();
    }
    function frame(dt){
      frameTime+=dt;if(frameTime<.2)return;frameTime=0;const v=renderer(),r=room(),state=model.visual,level=state.level,show=!hidden()&&!v.capturing,alive=new Set();
      for(const it of r.items){const C=LR.CAT[it.t],tool=kind(it,C),obj=v.objs.get(it.id);if(!tool||!obj)continue;const parts=obj.userData.parts;
        if(parts.privateMailFlag)parts.privateMailFlag.visible=show&&state.unread;
        for(let n=0;n<8;n++)if(parts['privateCoin'+n])parts['privateCoin'+n].visible=show&&n<level;
        if(parts.privateIdeas)parts.privateIdeas.visible=show&&state.ideas>0;
        if(LRWidgets.attached(it.t))continue;alive.add(it.id);let badge=badges.get(it.id);if(!badge){badge=document.createElement('span');badge.className='roomtool-private';badge.textContent='private';badge.setAttribute('aria-label','Private tool contents, excluded from shared rooms');document.body.appendChild(badge);badges.set(it.id,badge);}
        badge.hidden=!editing()||hidden();if(!badge.hidden){const p=v.root.localToWorld(v.itemPoint(it.id,[C.size[0]*4,(LR.topOf(it)||18)+2,4])).project(v.cam),rect=v.r.domElement.getBoundingClientRect();badge.style.left=rect.left+(p.x+1)*rect.width/2+'px';badge.style.top=rect.top+(1-p.y)*rect.height/2+'px';badge.hidden=p.z < -1 || p.z > 1;}
      }
      for(const [id,b] of badges)if(!alive.has(id)){b.remove();badges.delete(id);}
    }
    document.addEventListener('visibilitychange',()=>{if(document.hidden)flushStroke();});window.addEventListener('pagehide',flushStroke);
    return {open,close,seal,tick,frame,flush:flushStroke};
  }
  function register(L){
    const {def,CAT}=L;
    CAT.minifridge.privateTool='groceries';CAT.kettle.privateTool='tea';
    if(CAT.mailbox){CAT.mailbox.privateTool='mailbox';CAT.mailbox.tap='roomtool';}
    def('letterbox',{name:'Future-self mailbox',kind:'small',group:'cozy',size:[1,1],tap:'roomtool',privateTool:'mailbox',vars:[[0xd6b591],[0x94aaa1]],build(m,[c]){
      m.box(1,0,1,7,1,7,0x78634c).box(1,1,1,7,5,7,c).blob(4,5,4,3,2,3,c).box(2,3,7,6,4,8,0x554a40).box(2,1,7,6,2,8,0xffefcf);
      m.part('privateMailFlag',[7,3,3],'z');m.box(7,3,3,8,8,4,0x846f58).box(7,6,3,8,8,6,0xb96760);m.main();
    }});
    def('ideajar',{name:'Idea jar',kind:'small',group:'cozy',size:[1,1],tap:'roomtool',privateTool:'ideas',vars:[[0xb7d3cb]],build(m,[c]){
      m.box(1,0,1,7,1,7,c).box(1,1,1,2,8,7,c).box(6,1,1,7,8,7,c).box(2,1,1,6,8,2,c).box(1,8,1,7,9,7,0xc5a57d).box(1,1,6,7,2,7,c);
      m.part('privateIdeas',[0,0,0]);m.box(2,2,3,5,5,5,0xf8e5ad).box(4,3,5,6,6,6,0xf0c5bf);m.main();
    }});
    def('tallycounter',{name:'Pushup tally counter',kind:'small',group:'cozy',size:[1,1],tap:'roomtool',privateTool:'tally',vars:[[0xc9c5b8,0xd59563],[0x9aada8,0xc5a466],[0xa79db4,0xd49ba1]],build(m,[c,accent]){
      // Stubby metal clicker, inset number reels, side reset knob and thumb lever.
      m.box(1,0,1,7,1,7,0x665a50).box(1,1,1,7,4,7,c).box(2,4,2,6,5,6,c).box(1,2,0,7,4,1,0x524b48);
      for(let x=2;x<=5;x++){m.set(x,2,0,0xfff1d4);m.set(x,3,0,0xe3dac6);}
      m.box(2,5,3,6,6,5,accent).box(3,4,3,5,5,5,0x665a50).box(7,2,3,8,4,5,accent);
      m.box(0,1,5,1,4,7,c).box(0,4,5,3,5,7,c);
    }});
    def('savingsjar',{name:'Savings jar',kind:'small',group:'cozy',size:[1,1],tap:'roomtool',privateTool:'savings',vars:[[0xa9c5d2]],build(m,[c]){
      m.box(1,0,1,7,1,7,c).box(1,1,1,2,11,7,c).box(6,1,1,7,11,7,c).box(2,1,1,6,11,2,c).box(1,11,1,7,12,7,0xc5a57d).box(3,12,3,5,13,4,0x79634b);
      for(let n=0;n<8;n++){m.part('privateCoin'+n,[4,1,4]);m.box(2,1+n,3,6,2+n,6,n%2?0xe3ba60:0xf4d17d);}m.main();
    }});
    def('pixelposter',{name:'Pixel art print',kind:'wall',group:'wall',size:[2,2],depth:3,vars:[[0xc5a57d],[0x79604f]],build(m,[c]){m.box(0,0,0,16,16,2,c).box(1,1,2,15,15,3,0xfff4de);}});
    def('sketchbook',{name:'Pixel maker',kind:'small',group:'cozy',size:[2,1],tap:'roomtool',privateTool:'sketch',vars:[[0x8c9b82]],build(m,[c]){
      m.box(0,0,0,16,1,8,c).box(1,1,0,8,2,8,0xfff4d9).box(8,1,0,15,2,8,0xeee1c5).box(7,1,0,9,2,8,0xd1bea1);
      for(let z=1;z<8;z+=2)m.box(7,2,z,9,3,z+1,0x8c847a);m.box(12,2,1,13,3,7,0xd8a659);
    }});
  }
  const api={KEY,TALLY_GOAL,MAIL_DEFAULTS,day,validDate,cents,amount,TEA_PRESETS,dialMinutes,teaDisplay,ideaCards,ideaAdded,kind,create,createView,register};if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.LRRoomTools=api;register(root.LR);}
})(typeof window!=='undefined'?window:globalThis);
