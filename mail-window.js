// Shared letter fields and pixel stationery for the mailbox and typewriter.
(function (root) {
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  // Original little pixel illustrations, drawn locally; no images or network assets.
  const ICONS = [
    {id:'tulips',name:'Tulips',rows:['................','...rr...rr......','..rRrr.rRrr.....','..rRRr.rRRr..rr.','...rr...rr..rRrr','....g...g...rRRr','....g...g....rr.','....g.g.g....g..','....ggg.g.g..g..','.....gggggg..g..','......gggg..gg..','......yyyyyy....','.....yyYYyy.....','.......gg.......','.......gg.......','......g.g.......']},
    {id:'cat',name:'Cat',rows:['................','...dd......dd...','...dDdd..ddDd...','...dDDddddDDd...','...dDDDDDDDDd...','..dDDDDDDDDDDd..','..dDDdDDDDdDDd..','..dDDdDDDDdDDd..','..dDDDDrrDDDDd..','...dDDDDDDDDd...','....dddddddd....','....dDDDDDDd....','...dDDDDDDDDd...','...dDDDDDDDDd...','...dddddddddd...','................']},
    {id:'moon',name:'Moon',rows:['................','.......yyyyy....','.....yyYYyy.....','....yYYYyy......','...yYYYyy.......','..yYYYyy........','..yYYYy.........','..yYYYy.....y...','..yYYYyy....yy..','...yYYYyy..yyy..','....yYYYYyyyy...','.....yYYYYyy....','......yyyyy.....','................','...y........y...','................']},
    {id:'tea',name:'Tea',rows:['................','.....d..d.......','....d..d........','.....d..d.......','................','..dddddddddd....','..dLLLLLLLLdddd.','..dLLLLLLLLd..d.','..dLLLLLLLLd..d.','..dLLLLLLLLdddd.','...dLLLLLLd.....','....dddddd......','..yyyyyyyyyy....','...yyyyyyyy.....','................','................']},
    {id:'leaf',name:'Leaf',rows:['................','...........ggg..','........gggGGg..','......ggGGGGGg..','....ggGGGGGGGg..','...gGGGGGGgGGg..','..gGGGGGGgGGGg..','..gGGGGGgGGGGg..','..gGGGGgGGGGg...','..gGGGgGGGGg....','...gGgGGGGg.....','....ggGGgg......','....g.gg........','...g............','..g.............','................']},
    {id:'star',name:'Star',rows:['................','.......yy.......','......yYYy......','......yYYy......','.....yYYYYy.....','..yyyyYYYYyyyy..','..yYYYYYYYYYYy..','...yYYYYYYYYy...','....yYYYYYYy....','....yYYYYYYy....','...yYYYYYYYYy...','...yYYYyyYYYy...','...yYYy..yYYy...','....yy....yy....','................','................']}
  ];
  const normalizeIcon = value => ICONS.some(i=>i.id===value)?value:'tulips';
  function art(value) {
    const icon=ICONS.find(i=>i.id===normalizeIcon(value)),colors={d:'#393047',D:'#b9aa98',r:'#bd526c',R:'#ef8b9d',g:'#466a4a',G:'#83a46f',y:'#b58d45',Y:'#edc76e',L:'#a8c6b5'};
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'+icon.rows.flatMap((row,y)=>[...row].flatMap((c,x)=>colors[c]?[`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[c]}"/>`]:[])).join('')+'</svg>';
  }
  function decorate(form,head,page,from,initial,onChange) {
    if(!form.className.split(/\s+/).includes('pixel-postcard'))form.className+=' pixel-postcard';
    // One small corner stamp carries the picture; there is no large illustration.
    const stamp=el('span','postcard-stamp');stamp.setAttribute('role','img');head.appendChild(stamp);
    const signature=el('div','postcard-signature'),who=el('div','postcard-from'),label=el('small'),name=el('span'),date=el('small','postcard-date');label.textContent='WITH LOVE FROM';who.append(label,name);signature.append(who,date);page.after(signature);
    const picker=el('fieldset','postcard-picker'),legend=el('legend');legend.textContent='A little picture';picker.appendChild(legend);
    let icon=normalizeIcon(initial);const buttons=[];
    function update(value){icon=normalizeIcon(value);stamp.innerHTML=art(icon);stamp.setAttribute('aria-label',ICONS.find(i=>i.id===icon).name+' pixel illustration');name.textContent=from.value||'Me';buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.icon===icon)));}
    for(const item of ICONS){const b=el('button');b.type='button';b.dataset.icon=item.id;b.setAttribute('aria-label',item.name+' picture');b.innerHTML=art(item.id);b.onclick=()=>{update(item.id);onChange?.(item.id);};buttons.push(b);picker.appendChild(b);}
    from.addEventListener('input',()=>{name.textContent=from.value||'Me';});update(icon);
    return {picker,set:update,setDate:text=>{date.textContent=text||'';},get icon(){return icon;}};
  }
  function readCard(letter,clean) {
    const card=el('article','pixel-postcard postcard-read'),head=el('header','postcard-readhead'),to=el('small'),title=el('h3');
    to.textContent='TO: '+(letter.to||'You');title.textContent=letter.title||'A little letter';head.append(to,title);card.append(head);
    const page=el('div','mailwin-page'),body=el('div','roomtool-letter');
    if(letter.html)body.innerHTML=clean(letter.html);else body.textContent=letter.body||'';page.append(body);card.append(page);
    const from=el('input');from.value=letter.from||'Me';decorate(card,head,page,from,letter.cardIcon).setDate(letter.deliverOn||'');return card;
  }
  function create(options = {}) {
    const form = el('form', 'mailwin');
    form.noValidate = false;
    form.setAttribute('aria-label', options.label || 'Compose a letter');
    form.addEventListener('submit', e => e.preventDefault());
    const bar = el('div', 'mailwin-bar');
    bar.setAttribute('aria-hidden', 'true');
    const name = el('b', 'mailwin-name');
    const mark = el('i', options.icon === 'typewriter' ? 'mailwin-typewriter' : 'mailwin-envelope');
    name.append(mark, document.createTextNode(options.title || 'Email'));
    bar.append(el('i', 'mailwin-close'), el('i', 'mailwin-stripes'), name, el('i', 'mailwin-stripes'), el('i', 'mailwin-zoom'), el('i', 'mailwin-shade'));
    const head = el('div', 'mailwin-head');
    const fields = {};
    for (const [key, value, max] of [['From', options.from, options.fromMax || 120], ['To', options.to, options.toMax || 120], ['Subject', options.subject, options.subjectMax || 200]]) {
      const row = el('label', 'mailwin-row');
      const k = el('span', 'mailwin-key'); k.textContent = key;
      const input = el('input', 'mailwin-val');
      input.type = 'text'; input.value = value == null ? '' : String(value); input.maxLength = max; input.spellcheck = false;
      input.setAttribute('aria-label', key);
      row.append(k, input); head.appendChild(row); fields[key] = input;
    }
    const page = el('div', 'mailwin-page');
    const body = el(options.richText ? 'div' : 'textarea', 'mailwin-body');
    if (options.richText) {
      body.contentEditable = 'true'; body.setAttribute('role', 'textbox'); body.setAttribute('aria-multiline', 'true');
      body.spellcheck = true; if (options.bodyId) body.id = options.bodyId;
      body.setAttribute('aria-label', options.bodyLabel || 'Letter body');
      body.dataset.placeholder = options.placeholder || 'Dear friend,';
      if (options.body) body.innerHTML = options.body;
    } else {
      body.value = options.body == null ? '' : String(options.body); body.rows = 8;
      body.setAttribute('aria-label', options.bodyLabel || 'Message'); body.placeholder = options.placeholder || 'Hey future me!';
    }
    const scroll = el('div', 'mailwin-scroll');
    scroll.setAttribute('aria-hidden', 'true');
    scroll.append(el('i', 'up'), el('i', 'thumb'), el('i', 'down'));
    page.append(body, scroll);
    let toolbar = null;
    if (options.richText) {
      toolbar = el('nav', 'letter-tools mailwin-tools');
      toolbar.setAttribute('aria-label', 'Letter formatting');
      for (const [format, label, inner] of [['bold', 'Bold', 'B'], ['italic', 'Italic', 'I'], ['underline', 'Underline', 'U']]) {
        const b = el('button'); b.type = 'button'; b.dataset.format = format; b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', 'false');
        const mark = el(format === 'bold' ? 'b' : format === 'italic' ? 'i' : 'u'); mark.textContent = inner; b.appendChild(mark); toolbar.appendChild(b);
      }
      const rule = el('span'); toolbar.appendChild(rule);
      const date = el('button'); date.type = 'button'; date.id = 'letterDate'; date.textContent = 'Date stamp'; toolbar.appendChild(date);
    }
    const foot = el('div', 'mailwin-foot');
    let due = null;
    if (options.deliverOn) {
      const dueRow = el('label', 'mailwin-due');
      const dueKey = el('span'); dueKey.textContent = 'Deliver on';
      due = el('input'); due.type = 'date'; due.value = options.deliverOn.value || ''; due.required = options.deliverOn.required !== false;
      if (options.deliverOn.min) due.min = options.deliverOn.min;
      due.setAttribute('aria-label', 'Deliver on'); dueRow.append(dueKey, due); foot.appendChild(dueRow);
    }
    const actions = el('div', 'mailwin-actions');
    const saved = el('p', 'mailwin-saved'); saved.setAttribute('role', 'status'); saved.textContent = options.status || '';
    actions.appendChild(saved);
    const buttons = {};
    for (const spec of options.buttons || []) {
      const b = el('button', 'mailwin-btn' + (spec.className ? ' ' + spec.className : ''));
      b.type = 'button'; b.textContent = spec.label; if (spec.id) b.id = spec.id;
      actions.appendChild(b); buttons[spec.label] = b;
    }
    form.append(bar, head);
    if (toolbar) form.appendChild(toolbar);
    form.append(page, foot, actions);
    const postcard=options.postcard?decorate(form,head,page,fields.From,options.cardIcon,options.onIconChange):null;
    if(postcard)foot.prepend(postcard.picker);
    return { form, name, fields, body, toolbar, foot, due, saved, actions, buttons, postcard };
  }
  const api = { create, ICONS, normalizeIcon, art, readCard };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LRMailWindow = api;
})(typeof window !== 'undefined' ? window : globalThis);
