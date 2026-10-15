// Furniture-sized, local tools. One private device state, never room item fields.
(function(root){
  const KEY='lr.tools',day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);return day(new Date(y,m-1,d))===s;}
  function cents(value){
    const s=String(value).trim().replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Use an amount with at most two decimal places.');
    const [whole,fraction='']=s.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
    if(!Number.isSafeInteger(n)||n<=0)throw Error('Use a positive amount.');return n;
  }
  const amount=n=>(n/100).toFixed(2);
  function create({store,now=()=>new Date(),random=Math.random}){
    const old=store.get(KEY,{})||{},copy=a=>JSON.parse(JSON.stringify(a));
    const state={v:1,next:Number.isSafeInteger(old.next)&&old.next>0?old.next:1,
      mail:Array.isArray(old.mail)?old.mail:[],groceries:Array.isArray(old.groceries)?old.groceries:[],ideas:Array.isArray(old.ideas)?old.ideas:[],
      lastIdea:old.lastIdea||null,tea:old.tea||null,goal:old.goal||null,deposits:Array.isArray(old.deposits)?old.deposits:[],strokes:Array.isArray(old.strokes)?old.strokes:[]};
    const save=()=>{store.set(KEY,state);if(JSON.stringify(store.get(KEY,null))!==JSON.stringify(state))throw Error('Could not save on this device.');};
    const id=prefix=>prefix+'-'+now().getTime().toString(36)+'-'+state.next++;
    function send({title,body,html='',letterhead='',deliverOn}){
      if(!validDate(deliverOn)||deliverOn<=day(now()))throw Error('Choose a future date.');
      if(!String(body||'').trim())throw Error('Put a little something in the envelope.');
      const letter={id:id('mail'),title:String(title||'').trim()||'A note for future me',body:String(body||''),html:String(html),letterhead:String(letterhead),deliverOn,status:'sealed',read:false,notified:false,createdAt:now().getTime()};
      state.mail.unshift(letter);save();return copy(letter);
    }
    function poll(notices=true){
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
    function brew(minutes){if(!Number.isInteger(minutes)||minutes<1||minutes>30)throw Error('Choose between 1 and 30 minutes.');state.tea={minutes,endAt:now().getTime()+minutes*60000,status:'brewing',notified:false};save();}
    function cancelTea(){state.tea=null;save();}
    function enjoyTea(){if(state.tea){state.tea.status='done';state.tea.notified=true;save();}}
    const total=()=>state.deposits.reduce((n,d)=>n+d.cents,0);
    function goal(title,target){title=String(title).trim();if(!title)throw Error('Give your goal a name.');state.goal={title,target:cents(target)};save();}
    function deposit(value,note=''){if(!state.goal)throw Error('Set a goal first.');const n=cents(value);if(!Number.isSafeInteger(total()+n))throw Error('That total is too large for this jar.');state.deposits.unshift({id:id('deposit'),cents:n,note:String(note).trim(),date:day(now())});save();}
    function stroke(s){
      if(!['#443c34','#b66b66','#688f76','#6384a4'].includes(s.color))throw Error('Choose one of the pencils.');
      if(!Array.isArray(s.points)||!s.points.length||s.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))throw Error('That stroke is outside the paper.');
      state.strokes.push({color:s.color,points:copy(s.points)});save();
    }
    function undoStroke(){state.strokes.pop();save();}function clearSketch(){state.strokes=[];save();}
    return {send,poll,read,remove,addGrocery,checkGrocery,clearGroceries,addIdea,shake,brew,cancelTea,enjoyTea,goal,deposit,stroke,undoStroke,clearSketch,total,
      get state(){return copy(state);},get strokes(){return copy(state.strokes);},get tea(){return state.tea?copy(state.tea):null;},get visual(){return {unread:state.mail.some(l=>l.status==='arrived'&&!l.read),ideas:state.ideas.length,level:state.goal?Math.min(8,Math.ceil(total()/state.goal.target*8)):0};},get remaining(){return state.tea?.status==='brewing'?Math.max(0,state.tea.endAt-now().getTime()):0;}};
  }
  function kind(it,C){return C.privateTool || (it.t==='minifridge'||C.tap==='door'&&/fridge|icebox|refrigerator/i.test(C.name)?'groceries':it.t==='kettle'?'tea':it.t==='mailbox'?'mailbox':null);}
  function createView({model,sheet,renderer,room,editing,hidden,letters,word,onBrew=()=>{},sound,notice=()=>{}}){
    let active=null,anchor=null,resize=null,liveStroke=null,canvas=null,status=null,frameTime=0;
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
      if(tool==='mailbox')mailbox();else if(tool==='groceries')groceries();else if(tool==='ideas')ideas();else if(tool==='tea')tea();else if(tool==='savings')savings();else if(tool==='sketch')sketch();
    }
    function mailbox(){
      model.poll(false);shell('Letters to future you','A little time capsule, private to this device. It arrives on its date when you next visit your room.',root=>{
        const form=document.createElement('form');root.appendChild(form);
        const title=field(form,'Envelope title','text','A note for future me'),body=field(form,'Note to future me','textarea');body.rows=4;
        const date=new Date();date.setDate(date.getDate()+7);const due=field(form,'Deliver on','date',day(date)),tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);due.min=day(tomorrow);due.required=true;
        let snapshot=null;const draft=letters.model.get();
        if(draft)button(form,'Use my current typewriter letter',()=>{letters.flush();snapshot=letters.model.get();const template=document.createElement('template');template.innerHTML=LRLetters.sanitizeHTML(snapshot.body);body.value=template.content.textContent;body.readOnly=true;title.value=snapshot.title;text(form,'Typewriter formatting will travel inside this envelope.');});
        button(form,'Seal for later',()=>{if(!form.reportValidity())return;model.send({title:title.value,body:body.value,html:snapshot?LRLetters.sanitizeHTML(snapshot.body):'',letterhead:snapshot?.letterhead||'',deliverOn:due.value});sound.rustle();mailbox();});
        for(const l of model.state.mail){
          const row=document.createElement('section');row.className='roomtool-card';row.dataset.mail=l.id;row.dataset.mailStatus=l.status;root.appendChild(row);text(row,l.title,'roomtool-title');
          text(row,l.status==='sealed'?`Sealed until ${l.deliverOn}`:l.read?`Opened · ${l.deliverOn}`:`Arrived · ${l.deliverOn}`,'muted');
          if(l.status==='arrived')button(row,'Read letter',()=>{const letter=model.read(l.id);if(letter)readMail(letter);});
          removeButton(row,()=>{model.remove('mail',l.id);mailbox();});
        }
      });
    }
    function readMail(l){shell(l.title,l.letterhead || `A note from your past self · ${l.deliverOn}`,root=>{
      const paper=document.createElement('article');paper.className='roomtool-letter';if(l.html)paper.innerHTML=LRLetters.sanitizeHTML(l.html);else paper.textContent=l.body;root.appendChild(paper);button(root,'Back to mailbox',mailbox);
    });}
    function groceries(){shell('On the fridge door','Your grocery list, private to this device.',root=>{
      const form=document.createElement('form');root.appendChild(form);const input=field(form,'Add groceries');input.autocomplete='off';
      const add=()=>{model.addGrocery(input.value);groceries();active.querySelector('input').focus();};form.onsubmit=e=>{e.preventDefault();run(add);};button(form,'Add to list',add);
      const items=document.createElement('div');root.appendChild(items);
      for(const g of model.state.groceries){const row=document.createElement('div');row.className='roomtool-check';const label=document.createElement('label'),check=document.createElement('input'),span=document.createElement('span');check.type='checkbox';check.checked=g.done;check.setAttribute('aria-label',g.text);span.textContent=g.text;label.append(check,span);row.appendChild(label);check.onchange=()=>run(()=>model.checkGrocery(g.id,check.checked));button(row,'Remove',()=>{model.remove('groceries',g.id);groceries();});items.appendChild(row);}
      if(!model.state.groceries.length)text(items,'Nothing on the list yet.');
      button(root,'Clear checked items',()=>{model.clearGroceries();groceries();});button(root,'French word flashcard',flashcard);
    });}
    function flashcard(){const data=word();shell('Un mot par jour','A little French, on the fridge.',root=>{
      const card=document.createElement('div');card.className='roomtool-flashcard';text(card,data.word,'roomtool-title');const back=document.createElement('div');back.hidden=true;text(back,data.translation);text(back,data.example,'muted');card.appendChild(back);root.appendChild(card);
      const flip=button(root,'Reveal translation',()=>{back.hidden=!back.hidden;flip.textContent=back.hidden?'Reveal translation':'Hide translation';flip.setAttribute('aria-pressed',String(!back.hidden));});flip.setAttribute('aria-pressed','false');button(root,'Back to groceries',groceries);
    });}
    function ideas(){shell('The idea jar','Drop in a thought. Shake for a spark. All yours, on this device.',root=>{
      const input=field(root,'A little idea','textarea');input.rows=3;button(root,'Drop in jar',()=>{model.addIdea(input.value);sound.plop();ideas();});
      const result=text(root,'','roomtool-pick');result.setAttribute('aria-live','polite');
      const shake=button(root,'Shake for an idea',()=>{const idea=model.shake();if(!idea)return;result.textContent=idea.text;const v=renderer();if(anchor&&v.objs.has(anchor)){v.excite(anchor);v.burst(anchor,'magic',.8);}sound.rustle();});shake.disabled=!model.state.ideas.length;
      for(const idea of model.state.ideas){const row=document.createElement('div');row.className='roomtool-card';text(row,idea.text);removeButton(row,()=>{model.remove('ideas',idea.id);ideas();});root.appendChild(row);}
    });}
    function tea(){model.poll(false);shell('A little pot of tea','A quiet real-time steep. You can close this sheet and leave the room.',root=>{
      const timer=text(root,'','roomtool-timer');timer.dataset.teaClock='true';timer.setAttribute('role','timer');
      const select=document.createElement('select');select.setAttribute('aria-label','Tea steep');for(const [name,n] of [['Green tea · 2 minutes',2],['Black tea · 3 minutes',3],['Herbal tea · 5 minutes',5]]){const o=document.createElement('option');o.textContent=name;o.value=n;select.appendChild(o);}select.value='3';root.appendChild(select);
      const t=model.state.tea,running=t?.status==='brewing';select.disabled=running;
      const start=button(root,'Brew tea',()=>{model.brew(Number(select.value));onBrew(anchor);tea();});start.disabled=running;
      if(running)button(root,'Cancel steep',()=>{model.cancelTea();tea();});
      if(t?.status==='ready')button(root,'Enjoy the tea',()=>{model.enjoyTea();sound.sip();tea();});
      updateClock();
    });}
    function updateClock(){if(!active?.isConnected)return;const el=active.querySelector('[data-tea-clock]');if(!el)return;
      const t=model.tea;if(!t||t.status==='done')el.textContent='A moment to steep.';else if(t.status==='ready')el.textContent='Your tea is ready.';else {const s=Math.ceil(model.remaining/1000);el.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} to steep`;}
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
    function flushStroke(){if(liveStroke?.points.length)run(()=>model.stroke(liveStroke));liveStroke=null;}
    function sketch(){shell('A little sketchbook','A page for small doodles, private to this device.',root=>{
      let color='#443c34';const row=document.createElement('div');row.className='rowbtns';root.appendChild(row);
      for(const [name,c] of [['Graphite','#443c34'],['Rose','#b66b66'],['Sage','#688f76'],['Blue','#6384a4']]){const b=button(row,name,()=>{color=c;row.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});b.setAttribute('aria-pressed',String(c===color));}
      canvas=document.createElement('canvas');canvas.className='roomtool-sketch';canvas.setAttribute('aria-label','Sketchbook drawing pad');root.appendChild(canvas);
      const c=canvas;let drawingPointer=null;function point(e){const r=c.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
      c.onpointerdown=e=>{if(e.button!==0||liveStroke)return;e.preventDefault();drawingPointer=e.pointerId;c.setPointerCapture(e.pointerId);liveStroke={color,points:[point(e)]};draw();};
      c.onpointermove=e=>{if(!liveStroke||e.pointerId!==drawingPointer)return;e.preventDefault();const p=point(e),last=liveStroke.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])>.002){liveStroke.points.push(p);draw();}};
      c.onpointerup=c.onpointercancel=e=>{if(e.pointerId!==drawingPointer)return;if(liveStroke){flushStroke();draw();}drawingPointer=null;};
      button(root,'Undo stroke',()=>{flushStroke();model.undoStroke();draw();});let clearing=false;const clear=button(root,'Clear page',()=>{if(!clearing){clearing=true;clear.textContent='Clear this page?';}else{model.clearSketch();clearing=false;clear.textContent='Clear page';draw();}});
      resize=new ResizeObserver(()=>draw(true));resize.observe(c);draw(true);
    });}
    function draw(size=false){if(!canvas)return;const c=canvas,r=c.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1);if(size){c.width=Math.max(1,Math.round(r.width*ratio));c.height=Math.max(1,Math.round(r.height*ratio));}
      const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.lineCap=ctx.lineJoin='round';ctx.lineWidth=2*ratio;
      for(const s of [...model.strokes,...(liveStroke?[liveStroke]:[])]){ctx.strokeStyle=ctx.fillStyle=s.color;ctx.beginPath();s.points.forEach(([x,y],i)=>{if(!i)ctx.moveTo(x*c.width,y*c.height);else ctx.lineTo(x*c.width,y*c.height);});if(s.points.length===1){ctx.arc(s.points[0][0]*c.width,s.points[0][1]*c.height,ratio,0,Math.PI*2);ctx.fill();}else ctx.stroke();}
    }
    function tick(allowed){
      const events=model.poll(allowed);if(events.mail.length)notice(`${events.mail.length===1?'A letter from your past self has':'Letters from your past self have'} arrived.`);
      if(events.tea){sound.ritualChime();notice('Your tea is ready. Take a little pause.');}
      if(active?.isConnected)for(const l of model.state.mail){const row=[...active.querySelectorAll('[data-mail]')].find(r=>r.dataset.mail===l.id);if(row&&l.status==='arrived'&&row.dataset.mailStatus!=='arrived'){row.dataset.mailStatus='arrived';row.querySelector('.muted').textContent=`Arrived · ${l.deliverOn}`;button(row,'Read letter',()=>{const letter=model.read(l.id);if(letter)readMail(letter);});}}
      updateClock();if(events.tea&&active?.querySelector('[data-tea-clock]'))tea();
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
    return {open,close,tick,frame,flush:flushStroke,flashcard};
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
    def('savingsjar',{name:'Savings jar',kind:'small',group:'cozy',size:[1,1],tap:'roomtool',privateTool:'savings',vars:[[0xa9c5d2]],build(m,[c]){
      m.box(1,0,1,7,1,7,c).box(1,1,1,2,11,7,c).box(6,1,1,7,11,7,c).box(2,1,1,6,11,2,c).box(1,11,1,7,12,7,0xc5a57d).box(3,12,3,5,13,4,0x79634b);
      for(let n=0;n<8;n++){m.part('privateCoin'+n,[4,1,4]);m.box(2,1+n,3,6,2+n,6,n%2?0xe3ba60:0xf4d17d);}m.main();
    }});
    def('sketchbook',{name:'Sketchbook',kind:'small',group:'cozy',size:[2,1],tap:'roomtool',privateTool:'sketch',vars:[[0x8c9b82]],build(m,[c]){
      m.box(0,0,0,16,1,8,c).box(1,1,0,8,2,8,0xfff4d9).box(8,1,0,15,2,8,0xeee1c5).box(7,1,0,9,2,8,0xd1bea1);
      for(let z=1;z<8;z+=2)m.box(7,2,z,9,3,z+1,0x8c847a);m.box(12,2,1,13,3,7,0xd8a659);
    }});
  }
  const api={KEY,day,validDate,cents,amount,kind,create,createView,register};if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.LRRoomTools=api;register(root.LR);}
})(typeof window!=='undefined'?window:globalThis);
