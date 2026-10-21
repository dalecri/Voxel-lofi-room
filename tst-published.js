// TwoStoryTails published captions: a colourful grid of every post that went out,
// seeded from the owner's library and grown by the Caption studio's Published button.
// Device-private (lr.tstPublished); never written into rooms or share codes.
(function(root){
  'use strict';
  const KEY='lr.tstPublished',PAGE=30;
  const CATS=[{id:'cali',name:'Cali',color:'#ef9fc4'},{id:'neo',name:'Neo',color:'#8fcfa6'},{id:'ramses',name:'Ramses',color:'#f2d86a'},{id:'diego',name:'Diego',color:'#7fb2e3'}];
  // Tile colour is the category; the corner icon is the post's hook.
  const CATEGORIES=[
    {id:'food',name:'Food & treats',color:'#f0a24e'},
    {id:'job',name:'No bills, no job',color:'#f3e08a'},
    {id:'siblings',name:'Siblings',color:'#9cc8ec'},
    {id:'love',name:'Soft spot',color:'#f0b4d4'},
    {id:'dreamy',name:'Main character',color:'#b9a5d6'},
    {id:'tips',name:'Cat care',color:'#a9d8bf'},
    {id:'chaos',name:'Chaos',color:'#2b2b2b'},
  ];
  const ICONS={
    heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    case:'<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16"/>',
    bowl:'<path d="M4 12h16a8 8 0 0 1-16 0ZM9 9V6m3 3V5m3 4V6"/>',
    loop:'<path d="M8 9a3 3 0 1 0 0 6c2 0 3-1.5 4-3s2-3 4-3a3 3 0 1 1 0 6c-2 0-3-1.5-4-3S10 9 8 9Z"/>',
    spark:'<path d="M10 4v4M10 12v4M6 10h4M14 10h-4M17 15v4M15 17h4"/>',
    bolt:'<path d="M13 3 5 13h6l-1 8 8-10h-6Z"/>',
    bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.5 1.1.5 1.6V16h6v-.5c0-.5 0-1.2.5-1.6A6 6 0 0 0 12 3Z"/>',
  };
  const DEFAULT_ICON={food:'bowl',job:'case',siblings:'loop',love:'heart',dreamy:'spark',tips:'bulb',chaos:'bolt'};
  // [category, icon, text, cats]. Cats: c Cali, n Neo, r Ramses, d Diego.
  // A trailing … marks a caption that was cut off in the library screenshots.
  const SEED=[
    ['job','case',"there's no version of working from home where my cat isn't…",''],
    ['food','bowl',"my cat has main character energy and i'm just the guy who buys the food",''],
    ['love','heart',"i've never had a relationship this codependent where only one of us is…",'d'],
    ['food','bowl',"some people have alarm clocks, i have a cat who's decided breakfast is…",'nrc'],
    ['dreamy','spark','Having a girl cat','c'],
    ['chaos','bolt','no one warns you that personal space becomes a completely foreign concept.','d'],
    ['job','case',"POV: you've never paid a bill in your life and it shows",'d'],
    ['food','bowl','nothing humbles you like being loudly meowed at for food you just gave them…','r'],
    ['love','heart',"some days i don't feel like i did much, but i showed up for my cat and that…",'d'],
    ['siblings','loop','I think my cats have taught me more about patience than any person ever…','rd'],
    ['job','case','"You\'re so spoiled" God forbid i was adopted by child-free…','d'],
    ['love','heart','Non-negotiable habits as a cat dad','c'],
    ['siblings','loop','cats have mastered the art of looking innocent 0.2 seconds after…','c'],
    ['food','loop','They treat a cardboard box like a five star suite they personally…','rd'],
    ['dreamy','spark',"I can't believe he has his own little organs, his own little brain and his…",'d'],
    ['job','case','Another long day of being the wifi password','d'],
    ['tips','bulb',"Cat body language cues you're probably missing",'r'],
    ['dreamy','spark',"he'll walk right past a $__ cat bed to sit in the wrapping it came in instead",'r'],
    ['food','bowl','Started from the bottom now I have a house, two maids that serve me, and…','c'],
    ['dreamy','spark',"POV: You are living someone's best life",'r'],
    ['job','case','my cat has one job and making sure I never finish a task uninterrupted','c'],
    ['tips','bulb','How we manage 4 cats across 2 floors without losing our minds','rd'],
    ['food','bowl','some people have alarm clocks, I have cats who decided breakfast at 6a…','d'],
    ['job','case',"in your 20's & 30's you should put your money aside for savings... here…",'dr'],
    ['tips','bulb',"Window setups that changed my cats' entire mood",'n'],
    ['dreamy','spark','My cat has access to an entire house and still chooses to sit here','r'],
    ['love','heart',"i've never felt more chosen than the moment a cat decides you're their person",'d'],
    ['chaos','bolt','he demands to be let into a room and then immediately asks to be let back…','n'],
    ['food','bowl',"my cats have main character energy and i'm just the guy who buys the food",'dr'],
    ['dreamy','spark','Never stop begging.. you only need one yes to succeed','d'],
    ['tips','bulb','Signs your cat is in pain that are easy to miss','r'],
    ['siblings','loop','POV: You live in a multi-cat household','rd'],
    ['love','heart','Yeah, therapy is cool, but have you ever tried this?','d'],
    ['job','case',"there's no version of working from home where my cat isn't…",'r'],
    ['job','case',"What it's like to have no bills to pay",'dr'],
    ['dreamy','spark',"When my cat finds out we're spending the day rotting in bed",'n'],
    ['tips','bulb','Thinking of getting a Savannah cat? Read this before you do','r'],
    ['tips','bulb',"Decoding cat tail language: your cat's tail is basically subtitles for…",''],
    ['food','bowl','When the spare human says they already fed you','d'],
    ['dreamy','spark','How I talk to my cat every night before bed','d'],
    ['siblings','loop','every 2 cat household has one of each','d'],
    ['job','case','Day 89 of posting my cat online so he can start paying rent','d'],
    ['dreamy','spark','Every pet parent has accidentally created a daily ritual and now lives under a…','d'],
    ['love','heart','The cat I got to emotionally support me','d'],
    ['tips','bulb','Domestic cats vs exotic cats: same species, different operating…',''],
    ['dreamy','spark','And for the lady... perhaps a cat bed?',''],
    ['food','bowl','My cats trying to convince me nobody has fed them today','r'],
    ['job','case','daily reminder that no matter how tired you are after work, your cat has…','d'],
    ['chaos','bolt','I\'ve been lying to my cat for years. Every time he meows I say "I know"…','r'],
    ['love','heart','When dad defends you no matter what','r'],
    ['love','heart','When dad is shouting someone named Godsakesits5amstopmeowing but my name is literally Ramses.','r'],
    ['siblings','loop','My cats when they get supervised outdoor time','n'],
    ['love','heart','When you ask your man for back rubs but he passes out after 3 minutes','rd'],
    ['tips','bulb','when his wittle brain says potty time but his firmware is stuck on "hooma…','r'],
    ['dreamy','spark',"I'm no therapist, but have you tried doing this?",'d'],
    ['job','case','"You\'re so spoiled" God forbid I was adopted by a millenial that…','n'],
    ['dreamy','spark','What is the meaning of life?','c'],
    ['job','case','"Your house must be so peaceful without kids"','rd'],
    ['dreamy','spark','POV: My cat proposing the idea of another nap after just waking up from…','d'],
    ['dreamy','spark',"how do you explain this to someone who doesn't like cats",'d'],
    ['food','bowl','When you have multiple cats, one cat is always plotting to get food and…','r'],
    ['food','bowl','Me anytime my cat drinks bc that means he had a thought that he was…','d'],
    ['dreamy','spark','There is currently (1) cat in line for bed. Estimated wait time: 67…','r'],
    ['siblings','loop','when you are giving your first cat attention and the…','n'],
    ['siblings','loop','When your brother HATES being touched but your only…',''],
    ['food','loop','POV: Dad placed your treats in highly inconvenient…','r'],
    ['siblings','loop',"I don't want to bother my brother",'r'],
    ['food','loop','Our cat trying to convince us nobody has fed him today','r'],
    ['tips','bulb','Cats after using the litter box:','d'],
    ['dreamy','spark','Me when I see my cat do anything:','c'],
    ['dreamy','spark','I got called pretty today','d'],
    ['siblings','loop','When your hoomans decide to get a second cat without asking','d'],
    ['dreamy','spark','POV: The holiday guests have left and you can finally come out from hiding','r'],
    ['job','case','When an email at work says "any update on this?" and the update is that I forgo…','n'],
    ['job','case',"On today's episode of fat and jobless:",'n'],
    ['job','case','My cats acting like they just worked a gruelling 12 hour shift','d'],
    ['food','bowl','when dad starts complaining about his job but you literally only…','d'],
    ['job','case','"Your house must be so calm without kids" The house:','rd'],
    ['chaos','bolt','Meowed until everyone woke up and then went back to sleep. STAY TOXIC','n'],
    ['food','bowl','When the hooman says dinner might be slightly late','n'],
    ['food','bowl','When they say cats are a reflection of their owners and mine is always…','r'],
    ['dreamy','spark',"my brain when I'm asked to explain anything",'n'],
    ['love','heart','When your hooman picks you up for cuddles','d'],
    ['dreamy','spark','My cats the moment they hear me breathe in the morning','r'],
    ['love','heart','…his instinctual motherly love','dr'],
    ['job','case','…the home wifi password','d'],
    ['dreamy','spark','…little brain, just planning…','r'],
    ['food','bowl',"When you're forced to put up with daddy's antics because he's your treat…",'d'],
    ['siblings','loop','2 cat households at least 4 times per day','r'],
    ['food','loop','Give me second breakfast','d'],
    ['chaos','loop',"When Ramses' precious snooze makes you overlook the 3am zoomies",'r'],
    ['chaos','loop','How I look at my man after annoying him for absolutely no reason.','r'],
    ['chaos','loop','My cat, 90% chaos, 10% this.','d'],
    ['food','bowl',"Me unloading the entire week's drama to my cat whose only advice is to…",'d'],
    ['food','bowl','Turns out the secret ingredient to making the perfect biscuit…','rd'],
    ['siblings','loop','When your brother steals your bed so you have to curse him','dr'],
    ['siblings','loop','When the intrusive thoughts fall in sync.','r'],
    ['chaos','loop',"Don't make eye-contact, Don't make eye-contact, Don't make eye-…",'c'],
    ['love','heart','Just a mama taking care of her sleepy son','dr'],
    ['love','heart',"Neo's got that undeniable charm. Just ask him.",'n'],
    ['job','case','When your spoiled cat is forced to share the cat tree','rd'],
    ['job','case',"When they say 'sell your feet pics' but you're just a...",'c'],
    ['chaos','bolt',"Don't let the face fool you. She's taking notes.",'c'],
    ['food','bowl','Hired an eating machine and a supervisor. The machine is over-performing. The…','n'],
    ['job','case','The neighbourhood watch comitee takes its job very seriously','rd'],
    ['job','case','My cat when I tell him he has to contribute to the household... so he started…','d'],
    ['chaos','bolt','The audacity.','r'],
    ['dreamy','spark','Zzzz....','n'],
    ['dreamy','spark','Nothing to see here, just being a berry good girl ❤️🍓','c'],
    ['siblings','loop','POV: You live in a multi-cat household','dr'],
    ['dreamy','spark','Deep thawts...','d'],
    ['tips','bulb',"Me: scrubs the litter box till it's spotless. Ramses: And I took that…",'r'],
    ['food','loop',"When you find out hoomans don't have to 'sit' or 'stay' for snacks",'d'],
    ['food','loop','Your outie prefers dry food.','d'],
    ['tips','bulb',"Neo's favourite nap spots",'n'],
    ['chaos','bolt','Serious business happening here. Probably discussing their next 3 AM wake-…','n'],
  ];
  const CAT_KEYS={c:'cali',n:'neo',r:'ramses',d:'diego'};
  const seedPosts=()=>SEED.map(([category,icon,text,cats],i)=>({id:'seed-'+String(i+1).padStart(3,'0'),text,category,icon,cats:[...cats].map(k=>CAT_KEYS[k]).filter(Boolean),from:'library'}));
  const VALID_CAT=new Set(CATS.map(c=>c.id)),VALID_CATEGORY=new Set(CATEGORIES.map(c=>c.id));
  function clean(post){
    if(!post||typeof post!=='object'||typeof post.id!=='string'||typeof post.text!=='string'||!post.text.trim())return null;
    const category=VALID_CATEGORY.has(post.category)?post.category:'dreamy';
    return {id:post.id,text:post.text.slice(0,600),category,icon:ICONS[post.icon]?post.icon:DEFAULT_ICON[category],
      cats:Array.isArray(post.cats)?[...new Set(post.cats.filter(c=>VALID_CAT.has(c)))]:[],
      from:post.from==='studio'?'studio':'library',...(typeof post.clip==='string'?{clip:post.clip}:{}),...(Number.isFinite(post.at)?{at:post.at}:{})};
  }
  // A fresh guess for a studio caption; the owner can change it in the post sheet.
  function guess(text){
    const t=String(text).toLowerCase();
    const category=/food|treat|breakfast|dinner|snack|fed|hungry|eat/.test(t)?'food':/job|bill|work|rent|wifi|money|paying/.test(t)?'job':/brother|sister|sibling|two cats|2 cat|multi-cat|both/.test(t)?'siblings':/love|cuddle|chosen|heart|mama|support/.test(t)?'love':/tip|signs|how to|guide|cues|setup/.test(t)?'tips':/chaos|3am|3 am|zoom|audacity|toxic/.test(t)?'chaos':'dreamy';
    return {category,icon:DEFAULT_ICON[category],cats:CATS.filter(c=>new RegExp('\\b'+c.name+'\\b','i').test(text)).map(c=>c.id)};
  }
  function create({store,now=Date.now}){
    let posts;
    try{const saved=store.get(KEY,null);posts=Array.isArray(saved?.posts)?saved.posts.map(clean).filter(Boolean):null;}catch(e){posts=null;}
    if(!posts)posts=seedPosts();
    const persist=()=>{try{store.set(KEY,{v:1,posts});}catch(e){/* still usable this session */}};
    const find=id=>posts.find(p=>p.id===id);
    const copy=p=>p&&JSON.parse(JSON.stringify(p));
    return {
      get posts(){return posts.map(copy);},
      get:id=>copy(find(id)),
      publishedClip:clipId=>posts.some(p=>p.clip===clipId),
      // Newest first: a published studio caption joins the top of the grid.
      publish({clip,text}){
        if(typeof text!=='string'||!text.trim())return null;
        if(clip&&posts.some(p=>p.clip===clip))return copy(posts.find(p=>p.clip===clip));
        const g=guess(text),post=clean({id:'post-'+now().toString(36)+'-'+posts.length,text:text.trim(),...g,from:'studio',...(clip?{clip}:{}),at:now()});
        posts.unshift(post);persist();return copy(post);
      },
      update(id,patch){const p=find(id);if(!p)return null;const next=clean({...p,...patch,id:p.id});if(!next)return null;if(patch.category&&!patch.icon)next.icon=DEFAULT_ICON[next.category];Object.assign(p,next);persist();return copy(p);},
      // Removing a studio post sends its clip back to the studio.
      remove(id){const i=posts.findIndex(p=>p.id===id);if(i<0)return null;const [gone]=posts.splice(i,1);persist();return copy(gone);},
      filter({cat=null,category=null}={}){return posts.filter(p=>(!cat||p.cats.includes(cat))&&(!category||p.category===category)).map(copy);},
    };
  }
  // The grid view. Every caption is written with textContent.
  function render(host,{model,open=()=>{},state={}}){
    const doc=host.ownerDocument,el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const svg=(paths,size=18)=>`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    state.shown=state.shown||PAGE;
    function paint(){
      host.replaceChildren();
      const cats=el('div','tst-cats');cats.setAttribute('role','group');cats.setAttribute('aria-label','Filter by cat');
      for(const c of CATS){const b=el('button','tst-cat');b.type='button';b.style.setProperty('--cat',c.color);b.setAttribute('aria-pressed',String(state.cat===c.id));const face=el('span','tst-cat-face',c.name[0]);face.setAttribute('aria-hidden','true');b.append(face,el('span','tst-cat-name',c.name));b.onclick=()=>{state.cat=state.cat===c.id?null:c.id;state.shown=PAGE;paint();};cats.appendChild(b);}
      const chips=el('div','tst-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label','Filter by category');
      for(const c of CATEGORIES){const b=el('button','tst-chip');b.type='button';b.style.setProperty('--chip-dot',c.color);b.setAttribute('aria-pressed',String(state.category===c.id));b.append(el('span','tst-chip-dot'),el('span','',c.name));b.onclick=()=>{state.category=state.category===c.id?null:c.id;state.shown=PAGE;paint();};chips.appendChild(b);}
      const list=model.filter(state),count=el('p','tst-count',`${list.length} post${list.length===1?'':'s'}`);count.setAttribute('role','status');
      host.append(cats,chips,count);
      if(!list.length){host.appendChild(el('p','tst-empty','Nothing here yet. Publish a caption from the Caption studio and it lands here.'));return;}
      const grid=el('div','tst-grid');
      for(const p of list.slice(0,state.shown)){
        const cat=CATEGORIES.find(c=>c.id===p.category),tile=el('button','tst-tile');tile.type='button';tile.dataset.category=p.category;tile.dataset.post=p.id;tile.style.setProperty('--tile',cat.color);
        tile.setAttribute('aria-label',`${p.text}. ${cat.name}${p.cats.length?'. '+p.cats.map(id=>CATS.find(c=>c.id===id).name).join(', '):''}`);
        const icon=el('span','tst-icon');icon.innerHTML=svg(ICONS[p.icon]);const text=el('span','tst-text',p.text);const dots=el('span','tst-dots');dots.setAttribute('aria-hidden','true');
        for(const id of p.cats){const d=el('i');d.style.setProperty('--cat',CATS.find(c=>c.id===id).color);dots.appendChild(d);}
        tile.append(icon,text,dots);tile.onclick=()=>open(p.id);grid.appendChild(tile);
      }
      host.appendChild(grid);
      if(list.length>state.shown){const more=el('button','tst-more',`Show more (${list.length-state.shown} left)`);more.type='button';more.onclick=()=>{state.shown+=PAGE;paint();};host.appendChild(more);}
    }
    paint();return {refresh:paint};
  }
  const api={KEY,PAGE,CATS,CATEGORIES,ICONS,DEFAULT_ICON,SEED,seedPosts,clean,guess,create,render};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRTstPublished=api;
})(typeof window!=='undefined'?window:globalThis);
