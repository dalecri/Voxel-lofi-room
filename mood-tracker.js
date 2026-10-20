// Mood check-in adapted from the supplied Minimal Mood Tracker. All colors and
// interactions are scoped to this card; history lives in the existing lr.tools.
(function(root){
  const PROMPTS={0:['Mood','How are you feeling right now?'],2:['Energy level','How was your energy level today?']};
  const FRAMES=[
    {bg:[255,114,94],fg:[68,14,9],accent:[219,75,56],surface:[240,98,78],w:112,h:42,r:16,tilt:16,y:98,side:184,ctrl:146},
    {bg:[243,198,95],fg:[74,38,6],accent:[204,154,43],surface:[229,181,76],w:114,h:36,r:18,tilt:0,y:94,side:164,ctrl:146},
    {bg:[210,243,92],fg:[26,67,11],accent:[162,199,40],surface:[194,229,73],w:120,h:120,r:60,tilt:0,y:88,side:164,ctrl:188}
  ];
  const label=value=>value<.25?'BAD':value>.75?'GOOD':'NOT BAD';
  function mount(host,{model}){
    host.classList.add('mood-tracker');let value=1,prompt=0,note='';
    const el=(tag,cls,text,parent=host)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;};
    const button=(parent,text,aria,fn)=>{const b=el('button','',text,parent);b.type='button';b.setAttribute('aria-label',aria);b.onclick=fn;return b;};
    const main=el('div','mood-main'),top=el('div','mood-top',undefined,main);
    button(top,'↺','Reset mood',()=>{value=.5;note='';paint();});
    const toggle=el('div','mood-prompt-toggle',undefined,top);toggle.setAttribute('role','group');toggle.setAttribute('aria-label','Check-in type');
    const promptButtons=Object.entries(PROMPTS).map(([id,[name]])=>{const b=button(toggle,name,name,()=>{prompt=Number(id);paint();});return [Number(id),b];});
    const history=button(top,'','Mood history',openHistory);history.className='mood-history chipbtn sheet-icon';history.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    const count=el('span','mood-count','',history);
    const question=el('h3','mood-question','',main),character=el('div','mood-character',undefined,main),face=el('div','mood-face',undefined,character);
    face.setAttribute('aria-hidden','true');face.innerHTML='<svg viewBox="0 0 320 230"><g class="mood-eyes"><g data-eye="left"><rect fill="currentColor"/></g><g data-eye="right"><rect fill="currentColor"/></g></g><path data-mouth fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/></svg>';
    const word=el('div','mood-word','',character);word.setAttribute('aria-hidden','true');
    const slide=el('div','mood-slider-area',undefined,main),track=el('div','mood-slider',undefined,slide),line=el('div','mood-line',undefined,track),fill=el('div','mood-fill',undefined,track),thumb=el('div','mood-thumb',undefined,track);
    line.innerHTML='<i></i><i></i><i></i>';thumb.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';thumb.setAttribute('aria-hidden','true');
    const range=el('input','mood-range',undefined,track);range.type='range';range.min='0';range.max='100';range.step='1';range.setAttribute('aria-label','Mood');range.oninput=()=>{value=Number(range.value)/100;paint();};range.onpointerup=()=>{value=Math.round(value*2)/2;paint();};
    const stops=el('div','mood-stops',undefined,slide),stopButtons=[];for(const [n,text] of [[0,'Bad'],[.5,'Not bad'],[1,'Good']])stopButtons.push(button(stops,text,text,()=>{value=n;paint();}));
    const actions=el('div','mood-actions',undefined,main),noteButton=button(actions,'Add note','Add mood note',openNote);
    button(actions,'Submit →','Submit mood',()=>{try{model.recordMood(value,prompt,note);note='';paint();feedback.textContent='Mood logged!';}catch(e){feedback.textContent=e.message||'Could not save this mood.';}});
    const feedback=el('p','mood-feedback','',main);feedback.setAttribute('role','status');
    const panel=el('section','mood-panel');panel.hidden=true;panel.setAttribute('aria-label','Mood details');let returnTo=null;
    function closePanel(){panel.hidden=true;main.inert=false;returnTo?.focus();}
    function beginPanel(title,opener){returnTo=opener;main.inert=true;panel.replaceChildren();panel.hidden=false;const head=el('div','mood-panel-head',undefined,panel);el('h3','',title,head);const close=button(head,'×','Close mood details',closePanel);return close;}
    function openNote(){beginPanel('Add a quick note',noteButton);const input=el('textarea','mood-note',undefined,panel);input.rows=3;input.maxLength=160;input.value=note;input.placeholder="What's contributing to this feeling? (optional)";input.setAttribute('aria-label','Mood note');const row=el('div','mood-panel-actions',undefined,panel);button(row,'Clear','Clear mood note',()=>{input.value='';input.focus();});button(row,'Done','Save mood note',()=>{note=input.value.trim();paint();closePanel();});input.focus();}
    function openHistory(){const close=beginPanel('Your mood history',history),entries=model.moods,stats=el('div','mood-stats',undefined,panel);for(const text of ['GOOD','NOT BAD','BAD']){const stat=el('div','',undefined,stats);el('b','',String(entries.filter(e=>label(e.value)===text).length),stat);el('small','',text,stat);}const list=el('div','mood-history-list',undefined,panel);if(!entries.length){el('h4','','No entries logged yet',list);el('p','','Slide the face and tap Submit to track your mood.',list);}for(const entry of entries){const row=el('article','mood-entry',undefined,list),head=el('div','',undefined,row);el('strong','',label(entry.value),head);const date=el('time','',new Date(entry.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}),head);date.dateTime=new Date(entry.createdAt).toISOString();el('small','',PROMPTS[entry.prompt]?.[1]||PROMPTS[0][1],row);if(entry.note)el('p','',entry.note,row);}close.focus();}
    host.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();e.stopPropagation();closePanel();}});
    function paint(){
      const a=FRAMES[value<=.5?0:1],b=FRAMES[value<=.5?1:2],t=value<=.5?value*2:(value-.5)*2,mix=k=>a[k]+(b[k]-a[k])*t;
      for(const key of ['bg','fg','accent','surface']){const color='rgb('+a[key].map((v,i)=>Math.round(v+(b[key][i]-v)*t)).join(',')+')';host.style.setProperty('--mood-'+key,color);host.closest('#sheetBody')?.style.setProperty('--mood-'+key,color);}
      face.querySelectorAll('[data-eye]').forEach((eye,i)=>{eye.setAttribute('transform',`translate(${i?225:95},${mix('y')}) rotate(${mix('tilt')*(i?-1:1)})`);const rect=eye.firstElementChild;for(const [key,n] of Object.entries({x:-mix('w')/2,y:-mix('h')/2,width:mix('w'),height:mix('h'),rx:mix('r')}))rect.setAttribute(key,n);});
      face.querySelector('[data-mouth]').setAttribute('d',`M 140 ${mix('side')} Q 160 ${mix('ctrl')} 180 ${mix('side')}`);
      thumb.querySelector('path').setAttribute('d',`M 7 ${14.5-value*4} Q 12 ${8.5+value*7.3} 17 ${14.5-value*4}`);
      range.value=String(Math.round(value*100));range.setAttribute('aria-valuetext',label(value));thumb.style.left=fill.style.width=(value*100)+'%';word.textContent=label(value);question.textContent=PROMPTS[prompt][1];promptButtons.forEach(([id,b])=>b.setAttribute('aria-pressed',String(prompt===id)));noteButton.textContent=note||'Add note';count.textContent=String(model.moods.length);count.hidden=!model.moods.length;stopButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(Math.round(value*2)===i)));
    }
    paint();
  }
  const api={mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRMoodTracker=api;
})(typeof window!=='undefined'?window:globalThis);
