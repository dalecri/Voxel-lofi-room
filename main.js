// Lofi Rooms: input, decorating tools, things you can tap, sound, saving, the
// list of rooms and the little "cozy moments" journal.
// In the Android app, storage.js restores saves before boot and mirrors writes to SQLite.

function startLofiRooms() {
  const { HC, CAT, GROUPS, WALLS, FLOORS, WALL_COLORS, PRESETS, CATS, fp } = LR;
  const Sound = window.LofiSound;
  const $ = s => document.querySelector(s);
  const put = (k, v) => {
    if (window.Store) window.Store.set(k, v);
    else try { localStorage.setItem(k, v); } catch (e) { /* private mode */ }
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { put(k, JSON.stringify(v)); },
    del(k) { if (window.Store) window.Store.del(k); else try { localStorage.removeItem(k); } catch (e) {} },
  };
  const calendarModel=LRCalendar.create({store});
  const googleCalendar=LRCalendar.createGoogle({scope:LRCalendar.TASKS_EDIT_SCOPES});
  const googleTasksUI=LRCalendar.createTasksView({google:googleCalendar});
  const remember=(kind,options)=>{try{calendarModel.append(kind,options);}catch(e){/* optional memory never interrupts a ritual */}};
  const shop = LRShop.create({ store, today: () => today(), notify: n => { toast(`<b>✦ +${n}</b>`, 1700, false, 'firefly'); updateShopBalance(); }, onPurchase: item => {
    if (item.costume) { wardrobe.sync(); wardrobe.equip(item.costume); if (companion) { companion.setSlots(wardrobe.slots); companion.frame(0); } }
  }, onTip:n=>{catJournal.tip(meta.current);remember('tip');journalNews.edition(catJournal.entries);renderJournal();} });
  const rituals = LRRituals.create({ store });
  const focusGarden = LRFocusGarden.create({store,rituals});
  let breathCamera = null;
  let companion = null, widgetView = null, frenchUI = null, driftPaper = null;
  const widgets = LRWidgets.create({ store });
  const wardrobe = LRCostumes.create({ store, owns: id => shop.owns(id), seasons: LR.SEASONS || [] });
  const roomTools = LRRoomTools.create({ store,onBrew:t=>remember('tea',{id:t.endAt}),onTallyGoal:t=>{remember('pushups',{date:t.date,id:t.date});try{Sound.init();if(Sound.on)Sound.chime();}catch(e){/* quiet reps still count */}if(companion)companion.hop();} });
  const letters = LRLetters.createView({ store,sheet:codeSheet,dismiss:closeSheets,onClose:()=>$('#bHome').focus({preventScroll:true}),onSaved:l=>remember('letter',{id:l.id}), sound: Sound, roomName: () => room.name, beforeOpen: () => { frenchUI?.close(); barnaby.close(); closeSheets(); closeCrate(); exitCat(true); }, onWriting: on => { Sound.setWriting(on); if (stream) stream.volume = on ? .45 : 1; }, sender:()=>roomTools.compose().from, rememberSender:value=>roomTools.setFrom(value), onSendToFuture:letter=>{ letters.close(); roomToolsUI.seal(letter); }, mailbox:{count:()=>roomTools.state.mail.filter(l=>!l.read).length,open:()=>roomToolsUI.open('mailbox')} });

  // ---------------------------------------------------------------
  // Cozy moments
  const MOMENTS = [
    ['light', 'First light', 'Switched on a lamp'],
    ['lofi', 'Lofi hour', 'Put a record on'],
    ['rain', 'Rainy day', 'Listened to the rain'],
    ['nightowl', 'Night owl', 'Lamps glowing after dark'],
    ['purr', 'Purr', 'Petted a cat'],
    ['catnap', 'Cat nap', 'A cat curled up in its bed'],
    ['perch', 'High ground', 'A cat hopped up on the furniture'],
    ['tea', 'Tea time', 'Sipped something warm'],
    ['green', 'Green thumb', 'Five plants in one room'],
    ['books', 'Bookworm', 'Two bookshelves in one room'],
    ['gallery', 'Gallery wall', 'Four pieces of wall art'],
    ['cozy', 'All moved in', 'Twenty-five things in one room'],
    ['design', 'Redecorator', 'Changed the walls and the floor'],
    ['fire', 'Hearth', 'Lit the fireplace'],
    ['piano', 'Little tune', 'Played the piano'],
    ['sleep', 'Sweet dreams', 'Slept through the night'],
    ['gamer', 'Player one', 'Played a video game'],
    ['fish', 'Fish friends', 'Said hi to the fish'],
    ['barista', 'Barista', 'Brewed a fresh pot of coffee'],
    ['cinema', 'Movie night', 'Rolled a film after dark'],
    ['golden', 'Golden hour', 'Evening light through an open window'],
    ['hanami', 'Hanami', 'Watched the cherry blossoms fall'],
    ['lucky', 'Lucky cat', 'A maneki-neko waved hello'],
    ['tram', 'All aboard', 'Rang the tram bell'],
    ['city', 'City lights', 'An open-air scene after dark'],
    ['photo', 'Snapshot', 'Took a photo of your room'],
    ['greenhouse', 'Greenhouse', 'Ten plants in one room'],
    ['nightshift', 'Night shift', 'Working at a desk after midnight'],
    ['mixtape', 'Mixtape', 'Three jukebox tracks in one session'],
    ['stormwatch', 'Storm watcher', 'Rain outside, window open'],
    ['crates', 'Crates', 'Setup complete: a record crate, a player and speakers'],
    ['siesta', 'Siesta', 'A nap in the afternoon sunbeam'],
    ['snowedin', 'Snowed in', 'The fire lit on a rainy night'],
    ['stormy', 'Stormy night', 'Rain, a crackling fire and music all at once'],
    ['stormytea', 'Stormy tea', 'Tea while it rains'],
    ['moonlight', 'Moonlight sonata', 'Played the piano at night'],
    ['parliament', 'Cat parliament', 'All five cats in one room'],
    ['culprit', 'Whodunnit', 'A cat knocked something off a table'],
    ['visitor', 'Neighbour cat', 'A cat from next door dropped by'],
    ['catseye', 'Cat’s-eye view', 'Saw the room through a cat’s eyes'],
    ['dreamer', 'Dream mode', 'Stayed up past midnight as the room drifted'],
    ['watered', 'Thirsty no more', 'Gave a plant its daily water'],
    ['bloom', 'In bloom', 'A plant you watered every day burst into flowers'],
    ['forgiven', 'Forgiven', 'Won back a dramatic, ignored cat'],
    ['stoke', 'Stoked', 'Tossed a log on the fire'],
    ['harvest', 'Harvest', 'Picked herbs you grew yourself'],
    ['gardentea', 'Garden to cup', 'Sipped tea brewed from your own herbs'],
    ['clearwater', 'Crystal clear', 'Cleaned a cloudy fish tank'],
    ['goldfish', 'Golden visitor', 'A rare golden fish visited your tank'],
    ['settlingin', 'Settling in', 'Lit a candle in the evening'],
    ['nest', 'Nesting', 'Birds built a nest on your feeder'],
    ['withaview', 'A room with a view', 'Picked what your windows look out on'],
    ['cozyhome', 'Cozy home', 'Cared for a room until it glowed'],
    ['digger', 'Crate digger', 'Flipped through every record in the crate'],
    ['signed', 'Good guest', 'Signed a friend’s guest book'],
    ['guestbook', 'Guest book', 'A friend left a note in your room'],
  ].concat(LR.MOMENTS || []);   // theme packs can add their own with LR.MOMENTS.push([key, name, description])
  const found = new Set(store.get('lr.found', []));
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------------------------------------------------------
  // Rooms: a list of saved rooms, one open at a time
  let rooms = store.get('lr.rooms', []);
  const meta = Object.assign({ current: 0, realtime: true, phase: 'day', raining: false, music: false, sound: true, painted: {} }, store.get('lr.meta', {}));
  const activity = LRPerformance.createActivity({calm:meta.calmPerformance === true});
  // Retire the old blossom weather without changing the tree's petal interaction.
  if (meta.weather === 'sakura') { meta.weather = 'clear'; meta.raining = false; saveMeta(); }
  Sound.on = meta.sound;
  Sound.crackleOn = meta.crackle !== false;
  // music mood: 'auto' follows the time of day (morning bossa, afternoon chill, evening lofi, night ambient; jazz when it rains)
  if (meta.mood == null || meta.mood === 0 && !meta.moodSet) meta.mood = 'auto';
  const MOOD_BY = { morning: 4, day: 3, evening: 0, night: 5 };
  const autoMood = () => (meta.raining ? 1 : MOOD_BY[meta.phase] != null ? MOOD_BY[meta.phase] : 0);
  function applyMood() { return Sound.setMood(meta.mood === 'auto' ? autoMood() : meta.mood); }
  applyMood();
  let moodsPlayed = new Set();
  const room = new LR.Room();
  let villageView = null;
  function loadRoom(id) {
    const d = store.get('lr.room.' + id, null);
    if (d && room.load(d)) { meta.current = id; return true; }
    return false;
  }
  // Saved house rooms autosave. New rooms and friends' rooms remain drafts until
  // explicitly kept. A separate pending draft preserves experiments when startup
  // opens the owner's chosen main bedroom.
  // An edit is a change to what's built: lamps switched on or a cat wandering don't count.
  const sig = () => JSON.stringify([room.name, room.n, room.wall, room.floor, room.gild || null, room.items.filter(i => !i.visitor).map(i => [i.t, i.x, i.z, i.k, i.u, i.e, i.r | 0, i.c | 0, i.link || 0, ...(i.crown ? ['crown'] : [])])]);
  let baseSig = '';
  const isSaved = () => rooms.some(r => r.id === meta.current);
  const isEdited = () => sig() !== baseSig;
  let fresh = false;
  const draft = store.get('lr.draft', null);
  if (draft && draft.id === meta.current && room.load(draft.data)) baseSig = draft.base || '';
  else if (!rooms.length || !loadRoom(meta.current)) {
    if (rooms.length && loadRoom(rooms[0].id)) { /* recovered */ }
    else {
      PRESETS.study.make(room); room.name = PRESETS.study.name;
      const id = Date.now();
      rooms = [{ id, name: room.name, n: room.items.length }];
      meta.current = id; fresh = true;
    }
  }
  const mainBedroom = store.get('lr.mainBedroom', null);
  if (mainBedroom != null && rooms.some(r => r.id === mainBedroom) && meta.current !== mainBedroom && store.get('lr.room.' + mainBedroom, null)) {
    if (draft && draft.id === meta.current && !isSaved()) store.set('lr.pendingDraft', draft);
    else if (draft && draft.id === meta.current && isSaved()) {
      store.set('lr.room.' + draft.id, draft.data);
      const entry=rooms.find(r=>r.id===draft.id);entry.name=draft.data.name;entry.n=draft.data.items.length;saveIndex();
    }
    if(loadRoom(mainBedroom)){baseSig=sig();delete meta.visit;}
  }
  if (!baseSig) baseSig = sig();
  if (!rooms.length) fresh = true;   // your home always keeps at least one saved room

  // ---------------------------------------------------------------
  // Renderer
  const bg = $('#bg'), stars = $('#stars');
  let liftNow = 40;
  const view = new LRRender.Renderer($('#c'), {
    calmPerformance: meta.calmPerformance === true,
    catActivity(id, kind) { recordCat(room.get(id), kind); },
    catViewEnded() { document.body.classList.remove('catcam'); },
    catLand() { Sound.thump(0.5); },
    catSigh() { Sound.sigh(); },
    thunder() { const near = Math.random() < 0.4; setTimeout(() => Sound.thunder(near), near ? 120 : 500 + Math.random() * 900); },
    sky(top, bot, night) {
      bg.style.background = `linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
      stars.style.opacity = Math.max(0, night - 0.4) * 1.6;
      document.body.classList.toggle('night', night > 0.6);
      const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = top;
    },
    lift() { return liftNow; },
  });
  const roomSnapshots=LRRoomViews.createSnapshots({store,hash:LRVillage.decorHash});
  let snapshotRoomId=null;
  view.activity = activity;
  view.fx.activity = view.glowFx.activity = activity;
  view.glowOn = meta.glow !== false;
  // the living room: care for plants, cats, fires, candles, tanks and feeders (see care.js)
  const care = window.LRCare ? window.LRCare({ growthOverride:it=>focusGarden.growth(meta.current,it.id), room, view, CAT, Sound, store, meta, toast: (...a) => toast(...a), discover: k => discover(k), brewed:()=>remember('tea'), watered: it => { shop.earn('water', `${meta.current}:${it.id}`);remember('plant'); }, changed: () => changed(), saveMeta: () => saveMeta(), roomId: () => meta.current, today: () => today(), dateKey: d => dateKey(d) }) : null;
  store.del('lr.mode');   // editing is a temporary session, never a startup preference
  const state = { mode: 'explore', tool: 'add', group: 'furniture', add: 'sofa', addR: null, paintTab: 'walls', drag: null };
  const undo = [];
  const roomToolsUI = LRRoomTools.createView({ model: roomTools, sheet: codeSheet, renderer: () => view, room: () => room,
    editing: () => state.mode === 'edit', hidden: () => library.active || letters.active || barnaby.active || frenchUI?.active || filming || document.hidden || $('#photo').classList.contains('open'),
    onPhotos: id => cozy.photoPicker(id),
    onGroceryAdded: text => googleCalendar.addHousekeepingTask(text),
    bookRoom: () => meta.current,
    hangPixel:grid=>{const it=LRPixelMaker.hang(room,meta.current,grid,(id,piece,art)=>roomTools.pinPixel(id,piece,art),LR);changed();save();cozy.frame(0,view.t+1);closeSheets();toast('<span>Your pixel print is on the wall. Move it in Decorate.</span>',2400,true);return it;},
    portrait:reaction=>companionPortrait('idle',reaction),portraitKey:()=>JSON.stringify(wardrobe.slots),music:()=>!!meta.music,toggleMusic:()=>setMusic(!meta.music),
    letters, sound: Sound,
    notice: text => toast(`<span>${text}</span>`, 3200), onBrew: id => {
      const it=room.get(id); if (it) { if (care) care.tap(it,id,true); view.burst(id,'steam',3.5); }
      discover('tea');
    } });
  const library = LRLibrary.createView({model:LRLibrary.create({store,letters:()=>letters.model.list(),ideas:()=>roomTools.state.ideas}),sound:Sound,clean:LRLetters.sanitizeHTML,reduced:()=>view.reducedMotion,
    beforeOpen:()=>{frenchUI?.close();home.close(false);letters.close();barnaby.close();closeSheets();closeCrate();closePhoto();exitCat(true);if(rituals.breath.active)stopBreathing();},
  });
  const barnaby = LRBarnaby.createView({
    beforeOpen() {
      frenchUI?.close();
      home.close(false); letters.close(); library.close();
      closeSheets(); closeCrate(); closePhoto(); exitCat(true);
      if (rituals.breath.active) stopBreathing();
      if (stream) stream.volume = .45;
    },
    onClose() {
      if (stream) stream.volume = letters.active || barnaby.active ? .45 : 1;
      activity.wake();
    },
  });
  const files = LRDashboard.create({store, letters: letters.model});
  let pendingPortal = null;
  const dashboard = LRDashboard.createView({model:files,CAT,widgets,sheet:codeSheet,close:closeSheets,letters,localDestinations:()=>[{label:'Control Centre',icon:'🧰',action:()=>home.open()},...LRLauncher.TOOLS.map(p=>({...p,action:()=>{closeSheets();launchTool(p);}}))],room:()=>room,renderer:()=>view,
    hidden:()=>library.active || letters.active || barnaby.active || frenchUI?.active || filming || document.hidden || $('#photo').classList.contains('open'),
    notice:text=>toast(`<span>${esc(text)}</span>`,2600,true),
    onLaunch:p=>{const it=room.items.find(it=>it.t===p.furnitureId);if(it && widgetView)widgetView.feedback(it.id);if(p.furnitureId==='pomodorocandle')Sound.matchStrike();},
    saveScene:()=>LRWidgets.shareDecor(room.serialize()),encodeScene:decor=>roomCode(decor),
    openScene:f=>{
      const probe=new LR.Room();if(!probe.load(LRWidgets.shareDecor(f.decor)))throw Error('This scene could not be opened.');
      probe.items=probe.items.filter(i=>CAT[i.t]);closeSheets();leaveThen(()=>{
        exitCat(true);room.load(probe.serialize());meta.current=Date.now();delete meta.visit;undo.length=0;baseSig=sig();
        view.panGoal.set(0,0,0);view.zoomGoal=1;changed();save();updateHeader();
      });
    },
    placePortal:p=>{pendingPortal=p.id;closeSheets();addQuery='';addSearch.value='';state.addFilter=null;state.group='tech';state.tool='add';setMode('edit',true);pickAdd('appportal',true);}
  });

  const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPreference = store.get(LRHome.MOTION_KEY,null);
  Object.defineProperty(view,'reducedMotion',{get:()=>motionPreference ?? motionMedia.matches});
  function applyToolTheme() { document.body.dataset.toolTheme = ['light','dark'].includes(meta.toolTheme) ? meta.toolTheme : 'pastel'; }
  applyToolTheme();
  function applyMotion() {
    motionPreference = store.get(LRHome.MOTION_KEY,null);
    document.body.classList.toggle('reduce-motion', view.reducedMotion);
  }
  applyMotion(); motionMedia.addEventListener('change', applyMotion);
  const todayTasks=LRToday.create({store,earn:(source,id)=>shop.earn(source,id),onChecked:t=>remember('tasks',{id:t.id})});
  const taskPortraits=new Map();
  function companionPortrait(pose='idle',reaction='calm'){
    const key=JSON.stringify([wardrobe.slots,pose,reaction]);if(!taskPortraits.has(key)){
      const src=view.thumb({t:'companion-portrait:'+key,c:0,on:true},LRCompanion.definitionForSlots(wardrobe.slots,true),o=>{
        const pivot=new THREE.Group();o.add(pivot);pivot.add(o.userData.inner);LRCompanion.attachRig(o);LRCompanion.applyPose(o,pivot,{pose,mode:'idle',elapsed:0,tilt:reaction==='watching'?.12:0,weight:reaction==='happy'?.08:0,blink:pose==='sleep',pageTurn:0},true);
        if(reaction==='happy'){o.userData.parts.leftarm.rotation.z=-.6;o.userData.parts.rightarm.rotation.z=.6;}
      },180);if(taskPortraits.size>=12)taskPortraits.delete(taskPortraits.keys().next().value);taskPortraits.set(key,src);
    }return taskPortraits.get(key);
  }
  const todayUI=LRToday.createView({model:todayTasks,context:()=>({meta,tea:roomTools.tea,focus:rituals.activeFocus,daily:dailyInfo(),streak:store.get('lr.dailyStreak',{}).n||0,letterDraft:!!letters.model.get()?.body,ideaCount:roomTools.homeState.ideas.length}),
    saveWidgetOrder:order=>{const previous=meta.dashboardWidgetOrder;try{meta.dashboardWidgetOrder=order;saveMeta();if(JSON.stringify(store.get('lr.meta',{}).dashboardWidgetOrder)!==JSON.stringify(order))throw Error('Could not save this layout on your device.');}catch(e){meta.dashboardWidgetOrder=previous;throw e;}},
    completeMoment:()=>dailyCheck(dailyInfo().D.id),
    openRitual:id=>{closeSheets();if(id==='garden'){const active=rituals.activeFocus.find(f=>f.kind==='garden'&&f.active),bed=room.items.find(i=>i.t==='focusgarden');gardenUI.open(active?.id || bed?.id || null);}else if(id==='letter')letters.open();else if(id==='ideas')launchTool({id:'ideas'});},
    portraitKey:()=>JSON.stringify(wardrobe.slots),portrait:pose=>companionPortrait(pose),
    celebrate:()=>{try{Sound.init();if(Sound.on&&Sound.ctx?.state==='suspended')Sound.ctx.resume().then(()=>Sound.chime()).catch(()=>{});else Sound.chime();}catch(e){/* optional audio */}if(companion){companion.hop();const p=companion.object.position.clone();p.y+=.7;view.sparkle(p,0xf3d276,12);}activity.wake();},
    hidden:()=>library.active || barnaby.active || frenchUI?.active || filming || view.capturing || rituals.breath.active || document.hidden || $('#photo').classList.contains('open'),
    notice:text=>toast(`<span>${esc(text)}</span>`,2400,true),
    openTimer:row=>{home.close(false);letters.close();closeSheets();if(row.target==='tea')launchTool({id:'tea'});else if(row.target==='garden')gardenUI.open(row.focus.id);},
  });
  const spaceSources=()=>({rooms:rooms.map(r=>({id:r.id,name:r.id===meta.current?room.name:r.name})),CAT:Object.fromEntries(Object.entries(CAT).map(([id,C])=>[id,{name:C.name}])),letters:letters.model.list().map(l=>({id:l.id,title:l.title})),scenes:files.list('Scenes').map(f=>({id:f.id,title:f.title})),ideas:roomTools.homeState.ideas});
  function navigateSpace(target,item) {
    closeSheets();
    if(target==='settings'){store.set('lr.menuTab','Settings');renderMenu();openSheet();}
    else if(target==='daily'){store.set('lr.menuTab','Journal');renderMenu();openSheet();}
    else if(target==='merchant')openShop();
    else if(target==='tea')roomToolsUI.open('tea',room.items.find(i=>i.t==='kettle')?.id || null);
    else if(target==='mailbox')roomToolsUI.open('mailbox',room.items.find(i=>['mailbox','letterbox'].includes(i.t))?.id || null);
    else if(target==='Rooms')switchRoom(item.id);
    else if(target==='Ideas')roomToolsUI.open('ideas',room.items.find(i=>i.t==='ideajar')?.id || null);
    else if(target==='Letters'){const f=letters.model.list().find(l=>l.id===item.id);if(f)dashboard.openFile('Letters',f);}
    else if(target==='Scenes'){const f=files.list('Scenes').find(f=>f.id===item.id);if(f)dashboard.openFile('Scenes',f);}
    else if(target==='Furniture'){
      const C=CAT[item.id];if(!C)return;if(!shop.available(C)){openShop();return;}
      addQuery='';addSearch.value='';state.tool='add';state.group=C.group;state.addFilter=item.id;setMode('edit',true);pickAdd(item.id,true);
    }
  }

  const controlApps=()=>LRLauncher.destinations(CAT,widgets,files.custom,LRDashboard.destinations).filter(p=>!['rooms','todo','moments','settings','breathing'].includes(p.id));
  // A device-private destination ID, resolved from the same directory as Control Centre.
  const APP_SHORTCUT_KEY='lr.appShortcut';
  const shortcutApp=()=>{const id=store.get(APP_SHORTCUT_KEY,null);return controlApps().find(p=>p.id===id);};
  function updateAppShortcut(){
    const b=$('#bAppShortcut'),p=shortcutApp();
    b.replaceChildren();
    $('#bEditAppShortcut').hidden=!p;
    if(p){const icon=document.createElement(p.iconSrc?'img':'span');if(p.iconSrc){icon.src=p.iconSrc;icon.alt='';icon.className='mail-access-icon';}else icon.textContent=p.icon || '↗';icon.setAttribute('aria-hidden','true');b.appendChild(icon);}
    else b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    b.title=p?`Open ${p.label}. Change in Control Centre.`:'Choose room shortcut';
    b.setAttribute('aria-label',p?'Open '+p.label:'Choose room shortcut');
  }
  function appShortcutSheet(){
    codeSheet('Room shortcut','Choose an app for the button above the paw. Change it here in Control Centre anytime. Just yours, on this device.',h=>{
      const search=h('input','dashboard-search');search.type='search';search.placeholder='Find a tool or app';search.setAttribute('aria-label','Find a shortcut app');
      const grid=h('div','launcher-grid'),empty=h('p','muted');
      const draw=()=>{grid.replaceChildren();const q=search.value.trim().toLocaleLowerCase(),selected=store.get(APP_SHORTCUT_KEY,null),rows=controlApps().filter(p=>p.label.toLocaleLowerCase().includes(q));empty.textContent=rows.length?'':'No matching apps.';
        for(const p of rows){const b=document.createElement('button');b.type='button';b.className='launcher-tile';b.dataset.shortcut=p.id;b.setAttribute('aria-pressed',String(p.id===selected));
          const icon=document.createElement('span');icon.className='launcher-icon';icon.textContent=p.icon || '↗';icon.setAttribute('aria-hidden','true');if(p.iconSrc){const art=document.createElement('img');art.src=p.iconSrc;art.alt='';art.className='mail-access-icon';icon.replaceChildren(art);}const name=document.createElement('b');name.textContent=p.label;b.append(icon,name);
          b.onclick=()=>{store.set(APP_SHORTCUT_KEY,p.id);updateAppShortcut();closeSheets();$('#bAppShortcut').focus({preventScroll:true});toast(`<span>Shortcut set to ${esc(p.label)}</span>`,1800,true);};grid.appendChild(b);
        }
      };search.oninput=draw;draw();
      const clear=h('button','chipbtn','Clear shortcut');clear.onclick=()=>{store.del(APP_SHORTCUT_KEY);updateAppShortcut();closeSheets();$('#bAppShortcut').focus({preventScroll:true});};
    });
  }
  $('#bAppShortcut').onclick=()=>{
    updateAppShortcut();const p=shortcutApp();if(!p){appShortcutSheet();return;}
    home.close(false);letters.close();closeSheets();closeCrate();closePhoto();exitCat(true);launchTool(p);
  };
  $('#bEditAppShortcut').onclick=appShortcutSheet;
  updateAppShortcut();
  window.addEventListener('storage',e=>{if(!e.key || [APP_SHORTCUT_KEY,'lr.portals'].includes(e.key))updateAppShortcut();});
  // Return navigation exists only for the lifetime of an app launched from Home.
  let controlReturn=null;
  function unmountControlReturn(state){
    // Reusable views (especially French) may already be detached after a sheet switch.
    // Restore their original close button there too, before discarding the temporary row.
    if(state.marker?.parentNode)state.marker.replaceWith(state.close);
    if(state.inline)state.button.remove();else state.row?.remove();state.inline=false;state.host?.classList.remove('has-control-return');
    state.row=state.host=state.close=state.marker=null;
  }
  function clearControlReturn(){if(!controlReturn)return;controlReturn.observer.disconnect();clearTimeout(controlReturn.timeout);unmountControlReturn(controlReturn);controlReturn.button.remove();controlReturn=null;}
  function controlReturnTarget(){
    if($('#homeView'))return null;
    if(library.active)return {host:library.view.querySelector('.library-heading'),close:library.view.querySelector('.library-close'),inline:true};
    if(barnaby.active)return {host:document.querySelector('.barnaby-chrome'),close:document.querySelector('.barnaby-close'),inline:true};
    if($('#photo').classList.contains('open'))return {host:$('#photo'),close:$('#photoClose'),overlay:true};
    if(cozyOpen())return {host:cozyPop.querySelector('.cozy-pop-head'),close:cozyPop.querySelector('.cozy-pop-close'),inline:true};
    if(!$('#sheet').classList.contains('open'))return null;
    const body=$('#sheetBody');alignSheetHeader(body);const close=body.querySelector('.french-close,.sheet-close,#shopClose,#crownClose');
    if(!close)return null;
    const header=close.closest('[data-control-header]');
    return {host:header||body,close,inline:!!header};
  }
  function beginControlReturn(run,restore){
    clearControlReturn();
    const button=document.createElement('button');button.type='button';button.className='control-back';button.setAttribute('aria-label','Back to Control Centre');button.title='Back to Control Centre';button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg>';
    const state={button,entered:false,observer:null,timeout:null};
    const sync=()=>{
      if(controlReturn!==state)return;
      const target=controlReturnTarget();
      if(!target?.host){if(state.entered)clearControlReturn();return;}
      state.entered=true;clearTimeout(state.timeout);
      if(state.row?.isConnected&&state.host===target.host&&state.close===target.close)return;
      unmountControlReturn(state);
      if(target.inline){state.inline=true;state.host=state.row=target.host;state.close=target.close;target.host.classList.add('has-control-return');target.host.prepend(button);return;}
      const row=document.createElement('div');row.className='control-return-actions'+(target.overlay?' control-return-overlay':'');
      state.host=target.host;state.row=row;state.close=target.close;
      target.host.classList.add('has-control-return');
      if(target.close){state.marker=document.createComment('original close position');target.close.before(state.marker);}
      const nav=target.host.querySelector(':scope > .menu-nav'),grab=target.host.querySelector(':scope > .grab');
      if(nav)nav.before(row);else if(grab)grab.after(row);else target.host.prepend(row);
      row.appendChild(button);if(target.close)row.appendChild(target.close);
    };
    button.onclick=()=>{clearControlReturn();closeCozyMoments(false);restore();};
    state.observer=new MutationObserver(sync);controlReturn=state;state.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
    // Camera snapshots arrive asynchronously; wait for their existing preview.
    state.timeout=setTimeout(()=>{if(controlReturn===state&&!state.entered)clearControlReturn();},15000);
    try{run();sync();slideToolIn();}catch(e){clearControlReturn();throw e;}
  }
  // Control Centre closes and the tool's sheet opens in the same frame, so the CSS
  // transition never runs. Replay the Library's slide-up on the new sheet instead.
  function slideToolIn(){
    if(view.reducedMotion||!$('#sheet').classList.contains('open'))return;
    $('#sheetBody').animate?.([{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:350,easing:'cubic-bezier(.2,.9,.3,1)'});
  }
  const home = LRHome.createView({
    sheet:codeSheet,dismiss:closeSheets,
    apps:controlApps,
    previewKey:()=>JSON.stringify([meta.current,room.items.map(i=>[i.t,i.c])]),
    preview:p=>{const f=LRLauncher.furniture(p,room.items,CAT);return f?{...f,src:thumbOf(f.id,f.variant)}:null;},

    beforeOpen:()=>{clearControlReturn();frenchUI?.close();library.close();letters.close();closeSheets();closeCrate();closePhoto();exitCat(true);if(rituals.breath.active)stopBreathing();},
    onClose:()=>$('#bHome').focus(),
    actions:{
      launch:launchTool,
      depart:beginControlReturn,
      chooseShortcut:appShortcutSheet,
      addPortal:()=>dashboard.addPortal(),
      navigate:navigateSpace,
    },
  });
  frenchUI = LRFrench.createView({
    sheet:codeSheet,dismiss:closeSheets,
    todayBackground:id=>LRRoomTools.ideaBackground({id:'french:'+id}),
    model: LRFrench.create({ store, onStudied() { remember('french', { id: LRCalendar.day(new Date()) }); } }),
    portrait: reaction => companionPortrait('idle', reaction),
    onCorrect() {
      try { Sound.init(); if (Sound.on) Sound.chime(); } catch (e) { /* a quiet room is still a good answer */ }
      if (companion) companion.hop();
    },
    beforeOpen() {
      home.close(false); letters.close(); library.close(); barnaby.close();
      closeSheets(); closeCrate(); closePhoto(); exitCat(true);
      if (rituals.breath.active) stopBreathing();
    },
    reduced: () => view.reducedMotion,
  });
  LRFrench.load('assets/french.json').then(vocab => { frenchUI.model.setCards(vocab); frenchUI.refresh(); }).catch(err => console.warn(err && err.message ? err.message : err));
  function setControl(key,on) {
    if(key==='music') { if(!!meta.music!==on)playStation(on?0:-1); }
    // Music starts the built-in offline radio; custom streams stay in Sound.
    else if(key==='sound') { if(Sound.on!==on)Sound.toggle();meta.sound=Sound.on; }
    else if(key==='rain')liveWeather.manual(()=>applyWeather(on?'rain':'clear'));
    else if(key==='reduced'){store.set(LRHome.MOTION_KEY,on);applyMotion();}
    saveMeta();updateHeader();
  }
  // These shortcuts delegate to the same models and sheets as furniture taps.
  // Virtual anchors let room tools work before their decorative piece is placed.
  function launchTool(p) {
    if(p.url){dashboard.launch(p);return;}
    const find=(...types)=>room.items.find(i=>types.includes(i.t));
    const tools={mood:['moodjournal'],tally:['tallycounter'],mailbox:['mailbox','letterbox'],groceries:['minifridge'],ideas:['ideajar'],tea:['kettle'],savings:['savingsjar','tipjar'],sketch:['sketchbook']};
    if(tools[p.id]){roomToolsUI.open(p.id,find(...tools[p.id])?.id || null);return;}
    if(p.id==='library')library.open();
    else if(p.id==='digest')digestUI.open();
    else if(p.id==='captions')captionStudio();
    else if(p.id==='typewriter')letters.open();
    else if(p.id==='french')frenchUI.open();
    else if(p.id==='whiteboard')cozy.whiteboard(find('whiteboard')?.id || 'control-center-whiteboard');
    else if(p.id==='breathing')breathingSheet();
    else if(p.id==='wardrobe')wardrobeSheet();
    else if(p.id==='merchant')openShop();
    else if(['letters','scenes','photos'].includes(p.id))dashboard.files(p.id[0].toUpperCase()+p.id.slice(1));
    else if(p.id==='camera')$('#bPhoto').click();
    else if(p.id==='newspaper')newspaperSheet();
    else if(p.id==='calendar')calendar.open();
    else if(p.id==='tst')widgetAction(find('tstcorkboard') || {t:'tstcorkboard',id:null});
    else if(p.id==='moments'){closeSheets();openCozyMoments();}
    else if(['todo','rooms','sound','settings'].includes(p.id)){store.set('lr.menuTab',p.id==='todo'?'To-Do':p.id[0].toUpperCase()+p.id.slice(1));renderMenu();openSheet();}
  }
  $('#bHome').onclick=()=>home.open();

  (function starsBg() {
    const c = document.createElement('canvas'); c.width = 600; c.height = 900;
    const g = c.getContext('2d');
    for (let k = 0; k < 150; k++) {
      const s = Math.random() < 0.15 ? 3 : 2;
      g.fillStyle = `rgba(255,255,240,${0.35 + Math.random() * 0.6})`;
      g.fillRect((Math.random() * 600) | 0, (Math.random() * 900) | 0, s, s);
    }
    stars.style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  function realPhase() {
    const h = new Date().getHours();
    return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
  }
  if (meta.realtime) meta.phase = realPhase();
  view.env.phase = meta.phase; view.env.rain = !!meta.raining;
  view.setPhase(meta.phase, true);
  view.rainK = meta.raining ? 1 : 0; view.setRain(!!meta.raining); view.applyPhase(1);
  document.body.classList.toggle('raining', !!meta.raining);
  if (!meta.weather) meta.weather = meta.raining ? 'rain' : 'clear';
  setTimeout(() => applyWeather(meta.weather, true), 0);
  view.music = false;
  view.sync(room);

  // ---------------------------------------------------------------
  // Toasts & moments
  const toastQ = [];
  let toastBusy = 0;
  function toast(html, ms, now, cls) {
    if (now) { toastQ.length = 0; toastBusy = 0; document.querySelectorAll('#toasts .toast').forEach(el => el.remove()); }   // drag hints jump the queue
    if (cls !== 'firefly' && performance.now() < toastBusy) { if (toastQ.length < 4) toastQ.push([html, ms, false, cls]); return; }
    toastBusy = performance.now() + Math.min(ms || 3200, 1500);
    setTimeout(() => { if (toastQ.length) toast(...toastQ.shift()); }, Math.min(ms || 3200, 1500) + 50);
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : ''); el.innerHTML = html;
    $('#toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, ms || 3200);
  }
  // Daily Moment: one special cozy moment a day, the same for everyone on a given date. The local
  // YYYY-MM-DD is hashed into a seed for room.js's mulberry, which picks from a pool of moments with
  // recipes you can actually follow. It's per day, not per room: doing it in any room counts.
  const DAILY = [
    ['stormytea', 'Make tea while it rains: tap the cloud for rain, then a mug or the kettle'],
    ['mixtape', 'Play three different tracks on a jukebox'],
    ['nightowl', 'Switch on a lamp after dark'],
    ['golden', 'Open a window in the evening light'],
    ['tea', 'Sip from a mug or put the kettle on'],
    ['purr', 'Pet one of the cats'],
    ['lofi', 'Put a record on'],
    ['fire', 'Light the fireplace'],
    ['moonlight', 'Play the piano at night'],
    ['stormy', 'Rain, a lit fireplace and music, all at once'],
    ['cinema', 'Roll a film on the projector after dark'],
    ['catnap', 'Catch a cat napping in its bed'],
    ['watered', 'Water a plant (tap it once a day)'],
    ['stoke', 'Toss a log on the fire (tap a lit fireplace)'],
    ['bathtime', 'Run a bubble bath in the clawfoot tub (Bath & home tab)'],
  ];
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => dateKey(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); };
  function pickDaily(date) {
    let h = 2166136261;   // FNV-1a over the date string, then one draw from the seeded generator
    for (let k = 0; k < date.length; k++) { h ^= date.charCodeAt(k); h = Math.imul(h, 16777619); }
    return DAILY[Math.floor(LR.mulberry(h >>> 0)() * DAILY.length)][0];
  }
  // lr.daily = { date, id, done } re-rolls whenever the stored date isn't today; lr.dailyStreak = { n, last }
  // counts consecutive completed days and drops to 0 once a day is missed.
  function ensureDaily() {
    let D = store.get('lr.daily', null);
    const t = today();
    if (!D || D.date !== t) { D = { date: t, id: pickDaily(t), done: false }; store.set('lr.daily', D); }
    const S = store.get('lr.dailyStreak', { n: 0, last: '' });
    if (S.n && S.last !== t && S.last !== yesterday()) { S.n = 0; store.set('lr.dailyStreak', S); }
    return D;
  }
  (function migrateDaily() {   // the first version kept a streak in meta.daily (with unpadded dates)
    const old = meta.daily; if (!old) return;
    const m = String(old.date || '').match(/^(\d+)-(\d+)-(\d+)$/);
    if (m && old.streak && !store.get('lr.dailyStreak', null)) store.set('lr.dailyStreak', { n: old.streak, last: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` });
    delete meta.daily; saveMeta();
  })();
  ensureDaily();
  const merchant = LRLife.merchant({ store, today, owns: shop.owns, catalog: LRShop.catalog, exclusives: LRShop.exclusives });
  const catJournal = LRLife.journal({ store });
  const captionDesk = LRCaptions.create({store,changed:()=>{const host=$('.caption-studio');if(host)LRCaptions.render(host,captionDesk);const daily=$('.today-caption-desk');if(daily)LRCaptions.renderDaily(daily,captionDesk);}});
  const journalNews = LRLife.newspaper({ store, moments: MOMENTS });
  // The house press: pattern stories, tomorrow's box, pet sagas and claps (private, lr.press).
  const press = LRPress.create({ store });
  function pressSources() {
    let google = [], tasks = [];
    try { google = googleCalendar.cachedEvents?.(new Date()) || []; tasks = googleCalendar.cachedTasks || []; } catch (e) { /* Google stays optional and read-only */ }
    return { activity: calendarModel.activity(), catLog: catJournal.entries, focus: focusGarden.state.sessions, tally: roomTools.state.tally,
      events: calendarModel.events(), google, tasks, weather: meta.liveWeather ? meta.weatherDetails : null, rooms };
  }
  journalNews.edition(catJournal.entries);
  const ambientLife = LRLife.ambience({ random: () => Math.random() });
  let merchantCat = null, journalFeed = 'moments';
  function recordCat(cat, kind, thing) {
    if (!cat || cat.t !== 'cat' || cat.visitor) return;
    if (catJournal.write({ ...cat, name: catName(cat) }, kind, meta.current, thing)) { journalNews.edition(catJournal.entries); renderJournal(); }
  }
  const dailyInfo = () => { const D = ensureDaily(); const r = DAILY.find(x => x[0] === D.id) || DAILY[0]; const M = MOMENTS.find(x => x[0] === D.id); return { D, name: M ? M[1] : D.id, hint: r[1] }; };
  function dailyCheck(key) {
    const { D, name } = dailyInfo();
    if (D.done || D.id !== key) return;
    D.done = true; store.set('lr.daily', D);remember('daily',{date:D.date,id:D.date});
    const S = store.get('lr.dailyStreak', { n: 0, last: '' });
    S.n = S.last === yesterday() ? S.n + 1 : S.last === D.date ? S.n : 1; S.last = D.date;
    store.set('lr.dailyStreak', S); wardrobe.sync();
    shop.earn('daily');
    if (S.n > 0 && S.n % 7 === 0) shop.earn('streak');
    const log = store.get('lr.dailyLog', []);
    log.unshift({ date: D.date, id: D.id }); store.set('lr.dailyLog', log.slice(0, 60)); journalNews.edition(catJournal.entries);   // the journal, newest first
    setTimeout(() => {
      toast(`<b>☀ Today’s moment: ${name}</b><span>You made today cozy. ${S.n > 1 ? `${S.n} days in a row!` : 'Come back tomorrow for a new one.'}</span>`, 4200, true, 'daily');
      Sound.arpeggio(); setTimeout(() => Sound.chime(), 450);
    }, 1800);
  }
  function discover(key) {
    dailyCheck(key);
    if (key === 'tea' && meta.raining) setTimeout(() => discover('stormytea'), 2000);
    if (key === 'piano' && meta.phase === 'night') setTimeout(() => discover('moonlight'), 2000);
    if (found.has(key) || $('#intro').classList.contains('open')) return;
    const d = MOMENTS.find(x => x[0] === key);
    if (!d) return;
    found.add(key); store.set('lr.found', [...found]); journalNews.record(key); renderJournal();
    if (companion) companion.celebrate(key);
    shop.earn('moment');
    toast(`<b>✦ ${d[1]}</b><span>${d[2]}</span>`, 3800);
    Sound.chime(); if (key === 'cozy') setTimeout(() => Sound.arpeggio(), 600);
    updateHeader();
  }
  function checkRoomMoments() {
    const n = t => room.count(i => i.t === t);
    const plants = room.count(i => CAT[i.t].group === 'plants');
    if (plants >= 5) discover('green');
    if (plants >= 10) discover('greenhouse');
    if (new Set(room.items.filter(i => i.t === 'cat' && !i.visitor && i.c < 5).map(i => i.c)).size >= 5) discover('parliament');
    if (room.items.some(i => i.t === 'vinylcrate') && room.items.some(i => CAT[i.t].anim === 'record') && room.items.some(i => CAT[i.t].anim === 'speaker')) discover('crates');
    if (meta.raining && room.items.some(i => CAT[i.t].beam && i.on)) discover('stormwatch');
    if (n('bookshelf') >= 2) discover('books');
    if (n('painting') + n('poster') + n('mirror') + n('neon') + n('clock') >= 4) discover('gallery');
    if (room.items.length >= 25) discover('cozy');
    if (meta.painted.wall && meta.painted.floor) discover('design');
    if (view.ph.night > 0.6 && room.items.some(i => CAT[i.t].light && i.on)) discover('nightowl');
    if (meta.phase === 'evening' && room.items.some(i => CAT[i.t].beam && i.on)) discover('golden');
    if (view.ph.night > 0.6 && WALLS[room.wall.style] && WALLS[room.wall.style].none && room.items.length >= 8) discover('city');
  }
  function updateSaveChip() {
    const saved = isSaved(), edited = isEdited(), b = $('#bSave');
    b.hidden = saved && !edited;
    const g = $('#bGuest'); g.hidden = !(meta.visit && meta.visit.id === meta.current);
    document.body.classList.toggle('unsaved', !b.hidden || !g.hidden);
    b.classList.toggle('new', !saved);
    b.setAttribute('aria-label', saved ? 'Save changes' : 'Save this room to your home');
    $('#disc').textContent = !saved ? 'Not saved yet' : edited ? 'Saving changes…' : `✦ ${found.size} of ${MOMENTS.length} cozy moments`;
  }
  function updateHeader() {
    $('#roomName').textContent = room.name;
    updateSaveChip();
    $('#bMusic').classList.toggle('on', !!meta.music);
    $('#bTime').dataset.phase = meta.phase;
  }
  const haptic = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* unsupported */ } };

  // ---------------------------------------------------------------
  // Changing the room
  function pushUndo() {
    undo.push(room.snapshot());
    if (undo.length > 40) undo.shift();
  }
  function changed() {
    view.sync(room); snapshotRoomId=meta.current; driftPaper?.update();villageView?.refresh();
    dirty = true;
    checkRoomMoments();
    updateSaveChip();
  }
  function doUndo() {
    if (!undo.length) { toast('<span>Nothing to undo</span>', 1200); return; }
    const previous = undo.pop();
    if (typeof previous === 'string') room.restore(previous);
    else {
      // A surprise is a new draft. Undo travels back without overwriting either room.
      save(); room.restore(previous.data); meta.current = previous.current; baseSig = previous.base;
      if (previous.visit) meta.visit = previous.visit; else delete meta.visit;
    }
    changed(); updateHeader();
    Sound.turn(); haptic(5);
  }

  // ---------------------------------------------------------------
  // Tray: catalog thumbnails and paint swatches
  const thumbs = new Map();
  const thumbOf = (t, c) => {
    const k = t + ':' + (c || 0);
    if (!thumbs.has(k)) thumbs.set(k, view.thumb({ t, c: c || 0, on: CAT[t].on !== undefined ? CAT[t].on : false, r: 0, seed: 7 }));
    return thumbs.get(k);
  };
  function swatchCanvas(draw) {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d');
    for (let x = 0; x < 24; x++) for (let y = 0; y < 24; y++) {
      g.fillStyle = LR.hex(draw(x, y)); g.fillRect(x * 2, (23 - y) * 2, 2, 2);
    }
    return c;
  }
  const tray = $('#tray'), tabs = $('#tabs'), row = $('#row'), addSearch=$('#furnitureSearch');
  let addQuery='';
  const addLabels=new Map(GROUPS);
  const matchingAddItems=()=>Object.values(CAT).filter(C=>shop.available(C) && (addQuery ? (C.name+' '+(addLabels.get(C.group)||'')).toLocaleLowerCase().includes(addQuery.toLocaleLowerCase()) : C.group===state.group && (!state.addFilter || C.key===state.addFilter)));
  // Bound thumbnail work for broad searches across the entire catalog.
  const addItems=()=>addQuery?matchingAddItems().slice(0,60):matchingAddItems();
  addSearch.oninput=()=>{addQuery=addSearch.value.trim();state.addFilter=null;renderTray();};
  function renderTray() {
    const show = state.mode === 'edit' && (state.tool === 'add' || state.tool === 'paint');
    tray.classList.toggle('open', show);
    tabs.innerHTML = ''; row.innerHTML = '';
    addSearch.hidden=!show || state.tool!=='add';
    if (!show) return;
    const tab = (label, on, fn) => {
      const b = document.createElement('button'); b.className = 'tab' + (on ? ' on' : ''); b.textContent = label;
      b.onclick = () => { fn(); renderTray(); Sound.blip(); };
      tabs.appendChild(b);
    };
    if (state.tool === 'add') {
      GROUPS.forEach(([k, label]) => tab(label, state.group === k, () => { addQuery='';addSearch.value='';state.addFilter=null; state.group = k; }));
      if(state.addFilter){const all=document.createElement('button');all.className='chipbtn';all.textContent='Show all';all.onclick=()=>{state.addFilter=null;renderTray();};row.appendChild(all);}
      addItems().forEach(C => {
        const b = document.createElement('button');
        b.className = 'swatch' + (state.add === C.key ? ' on' : ''); b.dataset.furniture=C.key;
        const name = C.kind === 'pet' ? 'Cats' : C.name;
        b.innerHTML = `<img alt="" src="${thumbOf(C.key, 0)}"><span>${name}</span>`;
        b.title = name;
        b.onclick = () => pickAdd(C.key, true);
        row.appendChild(b);
      });
      if(addQuery && matchingAddItems().length>60){const hint=document.createElement('p');hint.className='hint';hint.textContent='Keep typing to narrow these results.';row.appendChild(hint);}
      if(!row.children.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='No furniture found. Try another word.';row.appendChild(empty);}
    } else {
      tab('Walls', state.paintTab === 'walls', () => { state.paintTab = 'walls'; });
      tab('Wall colour', state.paintTab === 'color', () => { state.paintTab = 'color'; });
      tab('Floor', state.paintTab === 'floor', () => { state.paintTab = 'floor'; });
      tab('Plot size', state.paintTab === 'size', () => { state.paintTab = 'size'; });
      tab('Window view', state.paintTab === 'view', () => { state.paintTab = 'view'; });
      const wc = (WALL_COLORS[room.wall.color] || WALL_COLORS[0])[1];
      if (state.paintTab === 'walls') {
        Object.entries(WALLS).filter(([, W]) => shop.available(W)).forEach(([k, W]) => {
          const b = document.createElement('button'); b.className = 'swatch' + (room.wall.style === k ? ' on' : '');
          b.appendChild(swatchCanvas((x, y) => W.fn(wc, x + 64, y + 2)));
          b.insertAdjacentHTML('beforeend', `<span>${W.label}</span>`);
          b.onclick = () => paintRoom(() => { room.wall.style = k; meta.painted.wall = true; });
          row.appendChild(b);
        });
      } else if (state.paintTab === 'color') {
        WALL_COLORS.forEach(([name, c], i) => {
          const b = document.createElement('button'); b.className = 'dot' + (room.wall.color === i ? ' on' : '');
          b.innerHTML = `<i style="background:${LR.hex(c)}"></i><span>${name}</span>`;
          b.onclick = () => paintRoom(() => { room.wall.color = i; meta.painted.wall = true; }, 'color');
          row.appendChild(b);
        });
      } else if (state.paintTab === 'view') {
        const names = { city: 'City', forest: 'Pine forest', ocean: 'Ocean', cabin: 'Snowy cabin' };
        LR.VIEWS.forEach(k => {
          const b = document.createElement('button'); b.className = 'swatch' + ((room.view || 'city') === k ? ' on' : '');
          b.appendChild(swatchCanvas((x, y) => LR.skyColor(meta.phase, meta.raining, Math.floor(x * 14 / 24), Math.floor(y * 22 / 24), 7, k) & 0xffffff));
          b.insertAdjacentHTML('beforeend', `<span>${names[k]}</span>`);
          b.onclick = () => { paintRoom(() => { room.view = k; }); discover('withaview'); toast(`<span>The windows look out on ${names[k].toLowerCase()} now</span>`, 1400); };
          row.appendChild(b);
        });
      } else if (state.paintTab === 'size') {
        const names = { 10: 'Cozy', 14: 'Roomy', 20: 'Block', 24: 'City' };
        LR.SIZES.forEach(n => {
          const b = document.createElement('button'); b.className = 'swatch' + (room.n === n ? ' on' : '');
          b.appendChild(swatchCanvas((x, y) => {
            const c = x, r = y, o = (24 - n) / 2;
            const inside = c >= o && c < o + n && r >= o && r < o + n;
            return inside ? ((c + r) & 1 ? 0xb89a72 : 0xa8885f) : 0x2a1c38;
          }));
          b.insertAdjacentHTML('beforeend', `<span>${n}×${n}</span>`); b.title = `${names[n] || 'Plot'} ${n}×${n}`;
          b.onclick = () => setPlot(n);
          row.appendChild(b);
        });
      } else {
        Object.entries(FLOORS).filter(([, Fl]) => shop.available(Fl)).forEach(([k, Fl]) => {
          const b = document.createElement('button'); b.className = 'swatch' + (room.floor.style === k ? ' on' : '');
          b.appendChild(swatchCanvas((x, y) => Fl.fn(x + 64, y + 64)));
          b.insertAdjacentHTML('beforeend', `<span>${Fl.label}</span>`);
          b.onclick = () => paintRoom(() => { room.floor.style = k; meta.painted.floor = true; }, 'floor');
          row.appendChild(b);
        });
      }
      row.insertAdjacentHTML('beforeend', state.paintTab === 'size'
        ? '<div class="hint">Bigger plots fit whole city blocks. Your pieces stay put when it grows.</div>'
        : '<div class="hint">Tip: tap any piece in the room to try its next colour.</div>');
    }
    const on = row.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    updateTrayArrows();
  }
  function pickAdd(key, fromTray) {
    const C = CAT[key];
    if (!C || !shop.available(C)) return;
    state.add = key; state.addR = null;
    renderTray(); Sound.turn(); refreshGhost();
    if (fromTray || !FINE) toast(`<span>${FINE ? 'Click' : 'Tap'} the room to place ${C.kind === 'pet' ? 'a cat' : 'the ' + C.name.toLowerCase()}</span>`, 1400);
  }

  // ---------------------------------------------------------------
  // Desktop: the mouse wheel and click-drag scroll the tray, arrows step through it
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function hScroll(el) {
    el.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // trackpads already scroll sideways
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      el.scrollBy({ left: d * 1.2, behavior: Math.abs(d) >= 50 ? 'smooth' : 'auto' });
    }, { passive: false });
    let drag = null;
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, s: el.scrollLeft, moved: false }; });
    window.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; el.classList.add('dragging'); }
      if (drag.moved) el.scrollLeft = drag.s - dx;
    });
    window.addEventListener('pointerup', () => {
      if (drag && drag.moved) { el.dataset.dragged = '1'; setTimeout(() => { delete el.dataset.dragged; }, 0); }
      el.classList.remove('dragging'); drag = null;
    });
    el.addEventListener('click', e => { if (el.dataset.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    el.addEventListener('scroll', updateTrayArrows, { passive: true });
  }
  function updateTrayArrows() {
    const max = row.scrollWidth - row.clientWidth;
    $('#trayPrev').hidden = row.scrollLeft < 4;
    $('#trayNext').hidden = row.scrollLeft > max - 4;
  }
  hScroll(row); hScroll(tabs);
  $('#trayPrev').onclick = () => row.scrollBy({ left: -row.clientWidth * 0.7, behavior: 'smooth' });
  $('#trayNext').onclick = () => row.scrollBy({ left: row.clientWidth * 0.7, behavior: 'smooth' });
  window.addEventListener('resize', updateTrayArrows);

  // keyboard: step through the tray (←/→) and its tabs (↑/↓)
  function stepTray(dir) {
    if (state.tool === 'add') {
      const list = addItems();
      if (!list.length) return;
      const i = list.findIndex(C => C.key === state.add);
      pickAdd(list[(i + dir + list.length) % list.length].key);
    } else {
      const items = [...row.querySelectorAll('.swatch, .dot')];
      const i = items.findIndex(b => b.classList.contains('on'));
      const next = items[(i + dir + items.length) % items.length];
      if (next) next.click();
    }
  }
  function stepTab(dir) {
    if (state.tool === 'add') {
      const i = GROUPS.findIndex(g => g[0] === state.group);
      addQuery='';addSearch.value='';state.addFilter=null;state.group = GROUPS[(i + dir + GROUPS.length) % GROUPS.length][0];
      const first = Object.values(CAT).find(C => C.group === state.group && shop.available(C) && (!state.addFilter || C.key===state.addFilter));
      if (first) state.add = first.key;
      state.addR = null;
    } else {
      const order = ['walls', 'color', 'floor', 'size'];
      state.paintTab = order[(order.indexOf(state.paintTab) + dir + order.length) % order.length];
    }
    renderTray(); Sound.turn(); refreshGhost();
  }
  // grow or shrink the plot; growing keeps everything where it is, shrinking only if nothing would fall off
  function setPlot(n) {
    if (n === room.n) return;
    if (n < room.n) {
      const out = room.items.filter(it => {
        const C = CAT[it.t];
        if (!C || it.p) return false;
        if (C.kind === 'wall') return it.u + C.size[0] > n;
        const [w, d] = LR.fp(it);
        return it.x + w > n || it.z + d > n;
      });
      if (out.length) { toast(`<span>Move ${out.length} piece${out.length > 1 ? 's' : ''} in from the edges first</span>`, 1800); Sound.turn(); return; }
    }
    paintRoom(() => { room.n = n; }, 'size');
    toast(`<span>Plot is now ${n}×${n}</span>`, 1100);
  }
  function paintRoom(fn, kind) {
    pushUndo(); fn(); if(kind!=='size'&&kind!=='view')LRShop.clearGild(room); saveMeta(); changed(); renderTray();
    (kind === 'floor' ? Sound.brush() : kind === 'color' ? Sound.tick2() : kind === 'size' ? Sound.place(0.9) : Sound.roller()); haptic(6);
  }

  document.querySelectorAll('.tools button').forEach(b => {
    b.onclick = () => {
      if (b.dataset.mode === 'explore') { setMode('explore'); return; }
      state.tool = b.dataset.tool;
      document.querySelectorAll('.tools button').forEach(x => x.classList.toggle('on', x.dataset.tool === state.tool));
      renderTray(); view.setGhost(null);
      const tips = { move: 'Drag a piece to move it', turn: 'Tap a piece to turn it', paint: 'Pick a wall or floor style, or tap a piece to recolour it', remove: 'Tap a piece to put it away' };
      if (tips[state.tool]) toast(`<span>${tips[state.tool]}</span>`, 1500);
      Sound.init(); Sound.turn();
    };
  });

  // ---------------------------------------------------------------
  // Explore / Decorate
  function setMode(mode, quiet) {
    if (mode !== 'explore') exitCat(true);
    state.mode = mode;
    const editing = mode === 'edit';
    for (const [selector, visible] of [['.tools',editing],['#tray',editing],['.explorebar',!editing]]) {
      const bar = $(selector); bar.hidden = !visible; bar.inert = !visible;
    }
    document.body.classList.toggle('exploring', mode === 'explore');
    state.drag = null; view.setGhost(null); setHidden(0);
    view.petsPaused = mode === 'edit';
    renderTray();driftPaper?.update();
    if (quiet) return;
    haptic(6);
    if (mode === 'edit' && !store.get('lr.tipEdit', false)) {
      store.set('lr.tipEdit', true);
      toast('<b>Decorating</b><span>Pick something from the tray, then tap or drag in the room to place it.</span>', 4200);
    }
    if (mode === 'edit' && FINE && !store.get('lr.tipKeys', false)) {
      store.set('lr.tipKeys', true);
      toast('<b>Mouse & keys</b><span>Scroll the tray with the wheel · <kbd>←→</kbd>&nbsp;pick ·&nbsp;<kbd>↑↓</kbd>&nbsp;tabs ·&nbsp;<kbd>R</kbd>&nbsp;turn ·&nbsp;<kbd>Del</kbd>&nbsp;remove</span>', 5200);
    }
    view.setHover(0);
  }
  $('#bEdit').onclick = () => { state.addFilter=null; setMode('edit'); Sound.init(); };
  if (FINE) {
    const hints = { add: 'Add (1)', move: 'Move (2)', turn: 'Turn (3, or R over a piece)', paint: 'Paint (4)', remove: 'Remove (5, or Delete over a piece)' };
    document.querySelectorAll('.tools [data-tool]').forEach(b => { b.title = hints[b.dataset.tool]; });
    document.querySelector('.tools [data-mode]').title = 'Done (Esc)';
    const chip = { bTime: 'Time of day', bMusic: 'Lofi radio (M) · Hold to open Sound', bUndo: 'Undo (Ctrl+Z)', bPhoto: 'Photo', bHome: 'Control Centre', bMenu: 'Menu (H)', bCat: 'Cat view (C)', rotL: 'Turn the room (Q)', rotR: 'Turn the room (E)', bEdit: 'Decorate (X)', bSurprise: 'Surprise room (G)' };
    for (const id in chip) { const el = document.getElementById(id); if (el) el.title = chip[id]; }
  }

  function surprise() {
    save();
    undo.push({ data: room.snapshot(), current: meta.current, base: baseSig, visit: meta.visit && { ...meta.visit } });
    if (undo.length > 40) undo.shift();
    let id = Date.now();
    while (id === meta.current || rooms.some(r => r.id === id)) id++;
    meta.current = id; delete meta.visit;
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const th = room.generate(seed);
    view.panGoal.set(0, 0, 0); view.zoomGoal = 1;
    baseSig = sig();
    changed(); save(); updateHeader();
    toast(`<b>${room.name}</b><span>${th.name} · Tap Save to keep it. Undo brings your old room back.</span>`, 2600);
    const d = $('#bSurprise svg'); if (d) { d.classList.remove('spin'); requestAnimationFrame(() => d.classList.add('spin')); }
    Sound.arpeggio(); haptic(10);
  }
  $('#bSurprise').onclick = () => { Sound.init(); surprise(); };

  // ---------------------------------------------------------------
  // Placement: where would this piece go under the finger?
  function setHidden(id) {
    view.hiddenId = id || 0;
    view.applyVisibility(); view.assignLights();
  }
  const clampI = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // base: the piece's type/colour/rotation; grab: offset between finger and anchor when moving
  function candidate(cx, cy, base, grab) {
    const C = CAT[base.t];
    const it = Object.assign({ t: base.t, c: base.c, r: base.r || 0, on: base.on, seed: base.seed, name: base.name }, {});
    if (C.kind === 'wall') {
      const w = view.pickWall(cx, cy, true);
      if (!w) return null;
      const [ww, wh] = C.size;
      it.k = w.k;
      it.u = clampI(Math.round(w.u - (grab ? grab.u : ww / 2)), 0, room.n - ww);
      it.e = clampI(Math.round(w.e - (grab ? grab.e : wh / 2)), 0, HC - wh);
      return it;
    }
    if (C.kind === 'small') {
      const ex = base.id ? [base.id, ...room.descendants(base.id).map(i => i.id)] : [];
      const hit = view.pickItem(cx, cy, ex);
      if (hit && !hit.behindWall) {
        let owner = room.get(hit.id);
        if (owner && !CAT[owner.t].top && owner.p) owner = room.get(owner.p);
        if (owner && CAT[owner.t].top) {
          const OC = CAT[owner.t], [w, d] = OC.size;
          const obj = view.objs.get(owner.id);
          const lp = obj.userData.inner.worldToLocal(hit.point.clone().add(view.root.position));
          const [cw, cd] = fp(it);
          it.p = owner.id; it.lx = clampI(Math.floor(lp.x - (cw - 1) / 2), 0, w - cw); it.lz = OC.kind === 'wall' ? 0 : clampI(Math.floor(lp.z - (cd - 1) / 2), 0, d - cd);
          return it;
        }
      }
    }
    const p = view.pickFloor(cx, cy);
    if (!p || p.x < -2 || p.z < -2 || p.x > room.n + 2 || p.z > room.n + 2) return null;
    const place = r => {
      const o = Object.assign({}, it, { r });
      const [fw, fd] = fp(o);
      o.x = clampI(Math.round(p.x - (grab ? grab.x : fw / 2)), 0, room.n - fw);
      o.z = clampI(Math.round(p.z - (grab ? grab.z : fd / 2)), 0, room.n - fd);
      return o;
    };
    if (!grab && C.wallish && state.addR == null) {
      // back it against the nearest wall, like you would in real life
      for (const r of [0, 1, 2, 3]) {
        const o = place(r), [fw, fd] = fp(o);
        const touches = (r === 0 && o.z === 0) || (r === 1 && o.x === 0) || (r === 2 && o.z + fd === room.n) || (r === 3 && o.x + fw === room.n);
        if (touches && room.canPlace(o)) return o;
      }
    }
    return place(it.r);
  }
  function applyPlacement(it, cand) {
    ['x', 'z', 'k', 'u', 'e', 'p', 'lx', 'lz', 'tipped'].forEach(k => delete it[k]);
    ['x', 'z', 'k', 'u', 'e', 'p', 'lx', 'lz', 'r'].forEach(k => { if (cand[k] !== undefined) it[k] = cand[k]; });
  }

  // ---------------------------------------------------------------
  // Tapping things in the room
  function interact(id, hit) {
    const it = room.get(id);
    if (!it) return;
    const C = CAT[it.t];
    view.boing(id); haptic(5); duck();
    if (it.tipped) { pushUndo(); it.tipped = false; changed(); Sound.place(weightOf(it)); toast(`<span>Picked the ${C.name.toLowerCase()} back up</span>`, 1200); return; }
    if (cozy.tap(it, hit?.part)) return;
    if (it.t==='galleryframe') { atlasUI.openArt(); return; }
    if (it.t==='barcounter') { atlasUI.openDrink(); return; }
    if (LRAtlas.BOOKSHELVES.includes(it.t)) { atlasUI.openBooks(LRWidgets.PORTALS.filter(p=>p.furnitureId===it.t)); return; }
    if (C.tap === 'launcher') { dashboard.launcher(); return; }
    if (C.tap === 'files') { dashboard.files(); return; }
    if (C.tap === 'appportal') { dashboard.portal(it, `${meta.current}:${it.id}`); return; }
    if (C.tap !== 'arcade' && widgetAction(it)) return;   // native games take priority over outbound portals
    const tap = C.tap;
    const privateTool = LRRoomTools.kind(it,C);
    if (privateTool) {
      if (privateTool === 'groceries') { view.openDoor(id); Sound.fridge(true); setTimeout(() => Sound.fridge(false),2700); }
      roomToolsUI.open(privateTool,id); return;
    }
    if (tap === 'focus-garden') { gardenUI.open(it.id); return; }
    if (tap === 'focus-label') { const label=focusGarden.label(meta.current,it.id);toast(`<b>${label?.completed?'Grown with a little focus':'A mystery seedling'}</b><span>${label?esc(new Date(label.end).toLocaleDateString())+' · '+label.minutes+' minutes':'A bloom from a cozy garden'}</span>`,3500,true);return; }
    if (tap === 'library') { library.open(); return; }
    if (tap === 'barnaby') { Sound.coin(); discover('gamer'); barnaby.open(); return; }
    if (tap === 'french') { Sound.flip(); frenchUI.open(); return; }
    if (tap === 'captions') { Sound.flip(); captionStudio(); return; }
    if (tap === 'wardrobe') { wardrobeSheet(); return; }
    if (tap === 'newspaper') { newspaperSheet(); return; }
    if (tap === 'shop') { openShop(id); return; }
    if (tap === 'crown') { crownSheet(); return; }
    if (care) setTimeout(() => care.tick(0), 60);   // reflect a caring tap right away
    if (care && care.tap(it, id)) return;
    if (tap === 'toggle') {
      pushUndo(); it.on = !it.on; changed();
      if (C.roomEffect) { toast(`<span>${C.name}: ${it.on ? 'on' : 'off'}</span>`, 1400); return; }
      toggleSound(it, C);
      if (it.on && C.light) discover('light');
      if (it.on && C.anim === 'fire') discover('fire');
      return;
    }
    // a declarative tap any piece can describe with fx: { toggle, say, sayOn, sayOff, burst, secs, sfx, sparkle, excite, spin, door, moment }
    if (tap === 'fx') {
      const F = C.fx || {};
      if (F.toggle) { pushUndo(); it.on = !it.on; changed(); if (it.on && C.light) discover('light'); }
      if (F.burst && (!F.toggle || it.on)) view.burst(id, F.burst, F.secs || 3);
      if (F.sparkle) view.sparkle(view.itemPoint(id, C.burstAt || [4, 8, 4]), F.sparkle, 12);
      if (F.excite) view.excite(id);
      if (F.spin) view.spin(id);
      if (F.door) view.openDoor(id);
      [].concat(F.sfx || (F.toggle ? 'click' : [])).forEach((s, k) => setTimeout(() => Sound[s] && Sound[s](it.on), k * 160));
      const lines = F.toggle ? (it.on ? F.sayOn : F.sayOff) || F.say : F.say;
      if (lines && lines.length) toast(`<span>${pickOne([].concat(lines))}</span>`, 1400);
      if (F.moment) discover(F.moment);
      return;
    }
    if (tap === 'portal') {
      const target = it.link && rooms.find(r => r.id === it.link);
      if (view.fp) {   // as a cat: trot over to the doorway, the walk-through check does the rest
        const [fx, fz] = doorFront(it);
        if (!view.walkCatTo(view.fp.id, fx, fz)) { const me = room.get(view.fp.id); if (target) walkThrough(it, target.id, me && { c: me.c, name: me.name }); else doorPicker(it); }
        else toast(`<span>${target ? `To ${target.name}` : 'A door to somewhere new'}</span>`, 1000, true);
        return;
      }
      if (target) walkThrough(it, target.id); else doorPicker(it);
      return;
    }
    if (tap === 'cuckoo') { cuckoo(id); return; }
    if (tap === 'read') { Sound.flip(); toast(`<span>${pickOne(C.lines)}</span>`, 2200); return; }
    if (tap === 'calendar') { Sound.flip();calendar.open();return; }
    if (tap === 'feeder') {
      view.feedBirds(id); Sound.crunch(); setTimeout(() => Sound.tweet(), 500); setTimeout(() => Sound.tweet(), 1300);
      view.sparkle(view.itemPoint(id, [4, 4, 5]), 0xc8a060, 10);
      toast(`<span>${pickOne(['A robin and a blue tit swoop in', 'Seed scattered, here they come', 'Tweet tweet!'])}</span>`, 1500);
      return;
    }
    if (tap === 'mood') {
      // cycle: auto → each mood in turn → back to auto
      const n = Sound.moods.length;
      meta.mood = Number.isInteger(C.musicMood) ? C.musicMood : meta.mood === 'auto' ? 0 : meta.mood + 1 >= n ? 'auto' : meta.mood + 1;
      meta.moodSet = true;
      const name = (meta.mood === 'auto' ? 'Follow the day · ' : '') + applyMood();
      moodsPlayed.add(Sound.mood); if (moodsPlayed.size >= 3) discover('mixtape');
      if (meta.station !== 0 || !meta.music) playStation(0, true); else saveMeta();
      view.excite(id); view.sparkle(view.itemPoint(id, [4, 14, 4]), 0xffd27a, 10);
      toast(`<span>Now playing: ${name}</span>`, 1600); discover('lofi');
      return;
    }
    if (tap === 'stars') {
      if (meta.phase === 'night' || meta.phase === 'evening' && Math.random() < 0.5) {
        const sky = ['Orion, the hunter', 'The Big Dipper', 'Cassiopeia’s W', 'Lyra and bright Vega', 'The Pleiades, seven sisters', 'Cygnus, the swan', 'A shooting star! Make a wish', 'Saturn, rings and all'];
        Sound.chime(); view.sparkle(view.itemPoint(id, [4, 16, 9]), 0xd8e0ff, 14);
        toast(`<span>✦ ${pickOne(sky)}</span>`, 1800); discover('stargazer');
      } else { Sound.click(false); toast(`<span>${meta.phase === 'evening' ? 'Not dark enough yet' : 'Too bright out there'}</span>`, 1300); }
      return;
    }
    if (tap === 'bowl') {
      Sound.crunch();
      const cat = view.callCat(id);
      if (cat) { const ci = room.get(cat);if(ci?.t==='cat')remember('cat'); setTimeout(() => ci?.t==='mxdog'?Sound.mxWoof():Sound.meow(), 300); toast(`<span>${ci ? (ci.name || (ci.t==='cat'?(CATS[ci.c] || CATS[0]).name:CAT[ci.t].name)) : 'A cat'} comes running!</span>`, 1500); discover('feast'); }
      else toast(`<span>${C.petFeed ? 'A snack is here whenever someone feels like it.' : room.items.some(i => i.t === 'cat') ? 'Nobody can reach the bowl' : 'Food’s out, but no cats yet'}</span>`, 1400);
      return;
    }
    if (tap === 'treats') { Sound.crunch(); toast('<span>Shake shake! Drop the jar on a cat with Move</span>', 1600); return; }
    if (tap === 'crate') { openCrate(); return; }
    if (tap === 'guestnote') { const n = it.note || {}; Sound.flip(); toast(`<b>${['♥', '★', '🐾', '✿', '☕', '♪', '☾', '✦'][it.c | 0] || '✉'} ${esc(n.n || 'A friend')}</b><span>${n.t ? `“${esc(n.t)}”` : 'Left you a sticker'}${n.d ? ` · ${new Date(n.d + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</span>`, 3600); return; }
    if (tap === 'curtain') { pushUndo(); it.on = !it.on; changed(); Sound.swish(); toast(`<span>${it.on ? 'Curtains open' : 'Curtains drawn'}</span>`, 1100); return; }
    if (tap === 'music') { nextStation(); return; }
    if (tap === 'pet') {
      if(it.t==='cat')atlasUI.catFact(id);
      const P = CATS[it.c] || CATS[0], nm = it.name || P.name, mood = care ? care.petCat(it) : 'content';
      recordCat(it, mood === 'ignore' || mood === 'ignore2' ? 'ignore' : mood === 'forgive' ? 'forgive' : 'pet');
      if (mood === 'ignore' || mood === 'ignore2') {   // neglected cats don't suffer, they get dramatic
        view.excite(id);
        toast(`<span>${mood === 'ignore' ? pickOne([`${nm} pointedly ignores you`, `${nm} turns away with a flick of the tail`, `${nm} stares at the wall instead`]) : pickOne([`${nm} is still thinking about it`, `${nm} allows one ear to swivel your way`])}</span>`, 1600);
        return;
      }
      if (mood === 'forgive') setTimeout(() => toast(`<span>Fine. ${nm} forgives you ♥</span>`, 1800), 1700);
      else if (mood === 'affectionate' && Math.random() < 0.4) setTimeout(() => toast(`<span>${nm} gives you a slow blink ♥</span>`, 1600), 1700);
      view.petCat(id); Sound.purr(true); setTimeout(() => Sound.purr(false), 2600);
      follow = { id, until: performance.now() + 9000 };   // for a little while it follows your taps
      if (Math.random() < 0.1) setTimeout(() => Sound.meow(0.8), 500);   // rare, so it stays special
      toast(`<span>${it.name || P.name} purrs ♥</span>`, 1600);
      discover('purr');
      return;
    }
    if (tap === 'sip') {
      Sound.sip(); discover('tea');
      const p = view.itemPoint(id, [4.5, 5, 4.5]);
      for (let k = 0; k < 10; k++) view.fx.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 0xffffff, 0.08, 1.4, -0.05, 0.4, 0.6);
      toast('<span>Mmm, still warm</span>', 1200);
      return;
    }
    if (tap === 'water') {
      Sound.water();
      const p = view.itemPoint(id, [4, 14, 4]);
      for (let k = 0; k < 3; k++) setTimeout(() => view.icon('drop', p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)), { size: 0.22, vy: -0.4, life: 1 }), k * 150);
      view.sparkle(p, 0xa8f0a0, 10);
      return;
    }
    if (tap === 'time') {
      const d = new Date();
      toast(`<span>It's ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>`, 1600);
      Sound.click(true);
      return;
    }
    if (tap === 'piano') {
      Sound.piano(); discover('piano');
      for (let k = 0; k < 4; k++) setTimeout(() => { const p = view.itemPoint(id, [3 + k * 3, 18, 6]); if (p) view.icon('note', p, { size: 0.3 }); }, k * 200);
      return;
    }
    if (tap === 'sleep') { Sound.blanket(); sleep(); return; }
    if ((tap === 'screen' || tap === 'type') && new Date().getHours() < 5) setTimeout(() => discover('nightshift'), 1200);
    if (tap === 'screen') {
      // off → each channel in turn → off
      const chans = C.channels || [];
      if (!it.on) { it.on = true; it.ch = 0; Sound.click(true); if (C.boot) Sound.boot(); }
      else if ((it.ch | 0) + 1 >= chans.length) { it.on = false; it.ch = 0; Sound.click(false); }
      else { it.ch = (it.ch | 0) + 1; Sound.static(); }
      changed();
      if (it.on) toast(`<span>${CH_NAMES[chans[it.ch | 0]] || 'On'}</span>`, 1100);
      if (it.on && /game|arcade|retro/.test(chans[it.ch | 0])) discover('gamer');
      if (it.on && it.t === 'projector' && view.ph.night > 0.3) discover('cinema');
      return;
    }
    if (tap === 'console') {
      // wake up the TVs and put the game on
      Sound.boot(); setTimeout(() => Sound.chiptune(), 200);
      let any = false;
      room.items.forEach(o => { const OC = CAT[o.t]; const g = OC.channels ? OC.channels.findIndex(c => c === 'game' || c === 'retro') : -1; if (g >= 0 && o.t !== 'handheld' && o.t !== 'computer') { o.on = true; o.ch = g; any = true; view.boing(o.id); } });
      changed(); discover('gamer');
      toast(`<span>${any ? 'Player 1 ready!' : 'Player 1 ready! (Add a TV to play on)'}</span>`, 1500);
      return;
    }
    if (tap === 'arcade') {
      if (!it.on) { it.on = true; changed(); }
      Sound.coin(); setTimeout(() => Sound.chiptune(), 300);
      view.play(id, 9); discover('gamer');
      toast('<span>Insert coin… GO!</span>', 1300);
      return;
    }
    if (tap === 'tank') {
      view.excite(id);
      // switching the light on is breakfast time: food drifts down and the fish swarm it
      if (!C.tank.bowl && !C.tank.pond) { it.on = !it.on; changed(); Sound.click(it.on); if (it.on) { setTimeout(() => { view.feedFish(id); Sound.plop(); }, 120); discover('fish'); } toast(`<span>${it.on ? 'Light on, breakfast time!' : 'Tank light off'}</span>`, 1100); }
      else { Sound.gurgle(3); toast('<span>Blub!</span>', 900); discover('fish'); }
      return;
    }
    if (tap === 'door') {
      view.openDoor(id);
      if (it.t === 'minifridge') { Sound.fridge(true); setTimeout(() => Sound.fridge(false), 2700); roomToolsUI.open('groceries', it.id); }
      else { Sound.creak(); setTimeout(() => Sound.creak(), 2600); toast(`<span>${pickOne(['What to wear…', 'So many sweaters', 'Found a lost sock'])}</span>`, 1500); }
      return;
    }
    if (tap === 'raise') { it.on = !it.on; changed(); Sound.hum(it.on); toast(`<span>${it.on ? 'Standing mode' : 'Sitting mode'}</span>`, 1100); return; }
    if (tap === 'blinds') { it.on = !it.on; changed(); Sound.rustle(); toast(`<span>${it.on ? 'Blinds up' : 'Blinds down'}</span>`, 1000); return; }
    if (tap === 'spin') { view.spin(id); Sound.whoosh(); return; }
    if (tap === 'puff') { view.burst(id, 'smoke', 3.5); Sound.puff(); toast('<span>Bubble bubble…</span>', 1100); return; }
    if (tap === 'boil') { view.burst(id, 'steam', 3.5); Sound.whistle(); toast('<span>The kettle’s singing</span>', 1400); discover('tea'); return; }
    if (tap === 'brew') { view.burst(id, 'steam', 4); Sound.gurgle(10); toast('<span>Fresh coffee ☕</span>', 1400); discover('barista'); return; }
    if (tap === 'pour') { view.burst(id, 'steam', 2.5); Sound.pour(); toast('<span>Tea’s ready</span>', 1200); discover('tea'); return; }
    if (tap === 'sink') { view.burst(id, 'drip', 1.5); Sound.drip(); return; }
    if (tap === 'strum') {
      Sound.strum();
      for (let k = 0; k < 3; k++) setTimeout(() => { const p = view.itemPoint(id, [4, 14 + k * 3, 6]); if (p) view.icon('note', p, { size: 0.28 }); }, k * 180);
      return;
    }
    if (tap === 'type') { letters.open(); return; }
    if (tap === 'snow') { view.burst(id, 'snow', 3); Sound.chime(); return; }
    if (tap === 'mist') { it.on = !it.on; changed(); Sound.whoosh(); toast(`<span>${it.on ? 'Lavender mist on' : 'Diffuser off'}</span>`, 1100); return; }
    if (tap === 'squeak') { Sound.squeak(); const p = view.itemPoint(id, [4, 8, 4]); if (p) view.icon('heart', p, { size: 0.3 }); return; }
    if (tap === 'robot') { view.petCat(id); Sound.beep(); toast('<span>Beep boop, cleaning!</span>', 1200); return; }
    if (tap === 'flip') { Sound.flip(); toast(`<span>${pickOne(['Rainy Day Beats', 'Midnight Tapes', 'Sunday Jazz', 'Cat Naps Vol. 2'])}</span>`, 1300); return; }
    if (tap === 'rustle') { Sound.rustle(); return; }
    if (tap === 'building') { it.on = !it.on; changed(); Sound.click(it.on); toast(`<span>${it.on ? 'Lights on upstairs' : 'Everyone’s asleep'}</span>`, 1100); return; }
    if (tap === 'traffic') { const o = view.objs.get(id); if (o) o.userData.allRed = view.t + 3; Sound.beep(); toast('<span>Walk signal!</span>', 900); return; }
    if (tap === 'tram') { Sound.bell(); toast('<span>Ding ding! All aboard</span>', 1200); discover('tram'); return; }
    if (tap === 'lucky') { view.excite(id); Sound.coin(); setTimeout(() => Sound.chime(), 200); toast(`<span>${pickOne(['Good luck is on its way!', 'Fortune smiles on you', 'Lucky day!'])}</span>`, 1400); discover('lucky'); return; }
    if (tap === 'wish') { Sound.place(); toast(`<span>${pickOne(['Make a wish…', 'Wishing you a cozy day', 'Fall down seven times, stand up eight'])}</span>`, 1500); return; }
    if (tap === 'slurp') { view.burst(id, 'steam', 2); Sound.sip(); toast('<span>Itadakimasu! 🍜</span>', 1300); discover('tea'); return; }
    if (tap === 'petals') { view.burst(id, 'petals', 3); Sound.rustle(); setTimeout(() => Sound.chime(), 150); discover('hanami'); return; }
    if (tap === 'vend') { Sound.coin(); setTimeout(() => Sound.fridge(false), 500); toast(`<span>${pickOne(['Hot canned coffee', 'Melon soda', 'Cold green tea', 'Calpis, nice', 'Royal milk tea'])}</span>`, 1500); return; }
    if (tap === 'shoji') { it.on = !it.on; changed(); Sound.rustle(); toast(`<span>${it.on ? 'Shoji slid open' : 'Shoji closed'}</span>`, 1000); return; }
    Sound.click(true);
    // nothing special to do: still give it a sound that fits
    if (!tap) {
      if (C.seat && /chair|stool/.test(it.t)) Sound.chairRoll();
      else if (C.seat || /sofa|beanbag|pouf|bed|futon|cushion|zabuton/.test(it.t)) Sound.cushion();
      else if (/book|libcase|libstack|shelf/.test(it.t)) Sound.flip();
      else Sound.place(weightOf(it) * 0.6);
    }
  }
  const pickOne = a => a[(Math.random() * a.length) | 0];
  // how heavy a piece sounds when it lands: a mug clinks, a wardrobe thuds
  function weightOf(it) {
    const C = CAT[it.t]; if (!C) return 0.4;
    if (C.kind === 'small') return 0.12;
    if (C.kind === 'rug') return 0.2;
    if (C.kind === 'pet') return 0.18;
    if (C.kind === 'wall') return 0.32;
    const [w, d] = C.size, top = typeof C.top === 'number' ? C.top : 10;
    return Math.min(1, 0.3 + w * d * 0.1 + top / 60);
  }
  const typeHash = t => { let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) | 0; return (Math.abs(h) % 100) / 100; };
  // switching things on and off sounds like the thing: lamps click (each a little different), neon crackles, fires whoosh, candles strike a match
  function toggleSound(it, C) {
    if (it.t === 'fireplace' || it.t === 'eukachel' || C.anim === 'fire') {
      if (!it.on) { Sound.lampClick(false, 0.6); return; }
      const lit = meta.litRooms || (meta.litRooms = []), first = !lit.includes(meta.current);
      Sound.ignite(first); if (first) { lit.push(meta.current); saveMeta(); }
    } else if (C.anim === 'buzz' || /neon/.test(it.t)) { if (it.on) Sound.neonOn(); else Sound.lampClick(false, 1.3); }
    else if (C.anim === 'flame' || /candle|candel/.test(it.t)) { if (it.on) Sound.matchStrike(); else if (Sound.ready()) Sound.soft(0.2, 0.04, 'lowpass', 900); }
    else Sound.lampClick(it.on, 0.75 + typeHash(it.t) * 0.6);
  }
  // the live soundscape, read from the room: what's here, what's on, the weather and the hour
  function itemSpot(it) {
    let i = it; for (let k = 0; i && i.p && k < 3; k++) i = room.get(i.p);
    if (!i) return null;
    if (CAT[i.t].kind === 'wall') { const n = room.n, u = i.u + 0.5, c = [[u, 0.5], [0.5, n - u], [n - u, n - 0.5], [n - 0.5, u]][i.k]; return { x: c[0], z: c[1] }; }
    const [w, d] = fp(i); return { x: i.x + w / 2, z: i.z + d / 2 };
  }
  function soundState(dt) {
    const P = view.fp && view.pets.get(view.fp.id), month = new Date().getMonth(), w = meta.weather || 'clear';
    // in cat view, closer things are louder; from above, everything sits at a gentle level
    const level = (list, base) => {
      if (!list.length) return 0;
      if (!P) return base;
      let d = Infinity; list.forEach(i => { const p = itemSpot(i); if (p) d = Math.min(d, Math.hypot(p.x - P.x, p.z - P.z)); });
      return Math.max(0.1, Math.min(1.5, 1.7 - d / 4));
    };
    const its = room.items, has = f => its.filter(f);
    return {
      dt, night: view.ph.night, indoors: !view.noWalls,
      fire: level(has(i => (i.t === 'fireplace' || i.t === 'eukachel' || CAT[i.t].anim === 'fire') && i.on), 0.8) * (care ? care.fireHeat() : 1),
      clock: level(has(i => CAT[i.t].anim === 'clock' || CAT[i.t].tap === 'time' || i.t === 'cuckoo'), 0.45),
      neon: level(has(i => (CAT[i.t].anim === 'buzz' || /neon/.test(i.t)) && i.on), 0.6),
      typing: level(has(i => /laptop|computer|typewriter|cyrig|cydeck/.test(i.t) && i.on), 0.55),
      bubbler: level(has(i => CAT[i.t].tank && !CAT[i.t].tank.pond && (i.on || CAT[i.t].tank.bowl)), 0.5),
      steam: its.some(i => CAT[i.t].steam) ? 1 : 0,
      rain: w === 'storm' ? 2 : w === 'rain' ? 1 : 0,
      wind: liveWeather.soundWind(w === 'snow' ? 1 : w === 'storm' ? 0.6 : (w === 'clear' && view.ph.night > 0.6 ? 0.4 : 0)),
      crickets: month >= 5 && month <= 7 && view.ph.night > 0.6 && (w === 'clear') ? (view.noWalls ? 1 : 0.6) : 0,
      birds: meta.phase === 'morning' && (w === 'clear') ? 1 : 0,
      city: view.noWalls ? 0.8 : its.some(i => CAT[i.t].anim === 'rgb' || /arcade|console|gaming/.test(i.t)) ? 0.55 : 0,
      cats: its.some(i => i.t === 'cat') ? 1 : 0,
      wash: level(has(i => CAT[i.t].rumble && i.on), 0.6),
      running: level(has(i => CAT[i.t].running && i.on), 0.6),
    };
  }
  function cuckoo(id) {
    view.pop(id, 2.6); Sound.cuckoo(); setTimeout(() => Sound.cuckoo(), 900);
    const d = new Date();
    toast(`<span>Cuckoo! It's ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>`, 1500);
    discover('cuckoo');
  }
  // seasonal decor: the set that matches today's date goes to the front of the tray, mentioned once a season
  (function suggestSeason() {
    const d = new Date(), m = d.getMonth(), day = d.getDate();
    const inRange = S => { const a = S.from[0] * 40 + S.from[1], b = S.to[0] * 40 + S.to[1], x = m * 40 + day; return a <= b ? x >= a && x <= b : x >= a || x <= b; };
    const S = (LR.SEASONS || []).find(inRange);
    if (!S) return;
    const i = GROUPS.findIndex(g => g[0] === S.group);
    if (i > 0) GROUPS.unshift(GROUPS.splice(i, 1)[0]);
    const key = S.group + '-' + (m === 0 ? d.getFullYear() - 1 : d.getFullYear());
    if (meta.season !== key) { meta.season = key; saveMeta(); setTimeout(() => toast(`<span>${S.label}</span>`, 3200), 4000); }
  })();
  let follow = null;
  // cat view: the room in first person, from one of the cats
  const held = new Set();
  window.addEventListener('keyup', e => { held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  window.addEventListener('blur', () => held.clear());
  const residentCats = () => room.items.filter(i => i.t === 'cat');
  function enterCat(id) {
    const cats = residentCats();
    if (!cats.length) { Sound.nope(); toast('<span>Add a cat first (Decorate, Add, Pets)</span>', 1800); return; }
    const pick = id ? room.get(id) : (follow && room.get(follow.id)) || cats.find(c => !c.visitor) || cats[0];
    if (!pick || !view.enterCatView(pick.id)) return;
    document.body.classList.add('catcam');
    $('#catName').textContent = catName(pick);
    Sound.meow(); haptic(8);
    if (!store.get('lr.tipCat', false)) { store.set('lr.tipCat', true); toast(`<span>${FINE ? 'Drag to look around, click the floor to walk, click things to use them. WASD walks too.' : 'Drag to look around, tap the floor to walk, tap things to use them'}</span>`, 3600); }
    else toast(`<span>You're ${catName(pick)} now</span>`, 1200);
    discover('catseye');
  }
  function nextCat() {
    const cats = residentCats(); if (!view.fp || cats.length < 2) return;
    const i = cats.findIndex(c => c.id === view.fp.id);
    enterCat(cats[(i + 1) % cats.length].id);
  }
  function exitCat(quiet) {
    if (!view.fp) return;
    view.exitCatView(); held.clear();
    const gone = room.items.filter(i => i.explorer);   // a cat that walked in with you heads back home
    if (gone.length) { gone.forEach(i => { view.poof(i.id, [0xffffff, 0xffd0e0]); room.remove(i.id); }); changed(); }
    document.body.classList.remove('catcam');
    if (!quiet) Sound.turn();
  }
  $('#bCat').onclick = () => { if (view.fp) exitCat(); else enterCat(); };
  $('#catNext').onclick = () => nextCat();
  $('#catExit').onclick = () => exitCat();
  const catName = it => it.name || (CATS[it.c] || CATS[0]).name;
  // mischief: now and then a cat wanders over and knocks something off a table
  function mischief() {
    if (rituals.breath.active || meta.mischief === false || state.mode !== 'explore' || state.drag || !room.items.some(i => i.t === 'cat' && !i.visitor)) return;
    const pick = room.items.filter(i => {
      const C = CAT[i.t], o = i.p && room.get(i.p);
      return o && !i.tipped && CAT[o.t].kind !== 'wall' && CAT[o.t].kind !== 'small' && (typeof CAT[o.t].top !== 'function' ? CAT[o.t].top : 12) <= 22 && C.size[0] === 1 && !C.light && !C.tank && !C.screen && !room.descendants(i.id).length;
    });
    if (!pick.length) return;
    const it = pick[(Math.random() * pick.length) | 0], owner = room.get(it.p);
    const sent = view.sendCat(view.spotsAround(owner));
    if (!sent) return;
    const knock = P => {
      if (!room.items.includes(it) || it.p !== owner.id) return;
      const spots = view.spotsAround(owner).filter(([x, z]) => !(Math.floor(P.x) === x && Math.floor(P.z) === z) && room.canPlace({ t: it.t, x, z, r: 0, id: -1 }));
      if (!spots.length) return;
      const [x, z] = spots[(Math.random() * spots.length) | 0];
      ['p', 'lx', 'lz'].forEach(k => delete it[k]);
      Object.assign(it, { x, z, r: (Math.random() * 4) | 0, tipped: true });
      changed(); view.poof(it.id, [0xffffff, 0xd8d0c4]); Sound.clatter(); Sound.scurry(); haptic(12);
      const cat = room.get(sent.id), who = cat ? catName(cat) : 'Someone';
      recordCat(cat, 'mischief', CAT[it.t].name.toLowerCase());
      toast(`<span>${pickOne([`${who} did it`, `${who} knocked the ${CAT[it.t].name.toLowerCase()} over`, `Crash! ${who} looks innocent`, `${who} is pretending nothing happened`])}</span>`, 2000, true);
      discover('culprit');
    };
    if (sent.path.length) sent.P.onArrive = knock; else knock(sent.P);
  }
  setInterval(() => { if (Math.random() < 0.35 * (care ? care.mischiefBoost() : 1)) mischief(); }, 40000);   // ignored cats get naughtier
  // a neighbour's cat wanders in now and then, hangs out and goes home
  let visitor = null;
  function visit() {
    if (rituals.breath.active || visitor || state.mode !== 'explore' || meta.visitors === false) return;
    const n = room.n, edge = [];
    for (let k = 0; k < n; k++) edge.push([k, 0], [0, k], [k, n - 1], [n - 1, k]);
    const free = edge.filter(([x, z]) => view.cellFree(x, z) && room.canPlace({ t: 'cat', x, z, r: 0, id: -1 }));
    if (!free.length) return;
    const [x, z] = free[(Math.random() * free.length) | 0];
    const it = room.add(room.make('cat', { x, z, c: 5, visitor: true }));
    visitor = it.id; changed();
    toast(`<span>Biscuit from next door wandered in 🐾</span>`, 2200, true); Sound.meow(); discover('visitor');
    setTimeout(() => {
      const v = room.items.includes(it) ? it : null;
      visitor = null;
      if (!v) return;
      view.poof(v.id, [0xe8a050, 0xffffff]);
      room.remove(v.id); changed();
      toast('<span>Biscuit heads home</span>', 1500);
    }, 45000 + Math.random() * 30000);
  }
  setInterval(() => { if (Math.random() < 0.15 * (care ? care.magicBoost() : 1)) visit(); }, 60000);   // cozy rooms get more visitors
  function merchantHere() { return merchant.active && merchantCat && room.items.includes(merchantCat) && meta.visitors !== false; }
  function tickWorld(dt) {
    const idle = !home.active && !library.active && !letters.active && !barnaby.active && !frenchUI?.active && !rituals.breath.active && !document.hidden && state.mode === 'explore' && !state.drag && !view.fp && !filming && !$('#photo').classList.contains('open') && !$('#intro').classList.contains('open');
    if (merchantHere() && sheet.classList.contains('open') && $('#sheetBody').dataset.merchant === 'here') merchant.linger();
    const edges = [];
    for (let k = 0; k < room.n; k++) edges.push([k, 0], [0, k], [k, room.n - 1], [room.n - 1, k]);
    const free = edges.filter(([x, z]) => view.cellFree(x, z) && room.canPlace({ t: 'merchantcat', x, z, r: 0, id: -1 }));
    merchant.tick(dt, idle && !sheet.classList.contains('open') && meta.visitors !== false && free.length > 0, view.cozy);
    if (merchantCat && (!merchant.active || !room.items.includes(merchantCat) || meta.visitors === false)) {
      if (room.items.includes(merchantCat)) { view.poof(merchantCat.id, [0x756094, 0xffe39a]); room.remove(merchantCat.id); changed(); }
      merchantCat = null;
      if ($('#sheetBody').dataset.merchant === 'here' && sheet.classList.contains('open')) openShop();
    }
    if (merchant.active && !merchantCat && idle && meta.visitors !== false && free.length) {
      const [x, z] = free[Math.floor(Math.random() * free.length)];
      merchantCat = room.add(room.make('merchantcat', { x, z, visitor: true, name: 'Mallow' }));
      changed(); Sound.meow(0.5);
      toast('<span>Mallow wandered in with a few little treasures. Tap his satchel 🐾</span>', 3200);
      room.items.filter(i => i.t === 'cat' && !i.visitor).slice(0, 1).forEach(cat => recordCat(cat, 'merchant'));
    }
    const event = ambientLife.tick(dt, idle && !view.reducedMotion && !sheet.classList.contains('open'), { window: room.items.some(i => CAT[i.t].beam), rain: meta.raining, day: meta.phase === 'day' || meta.phase === 'morning' });
    if (event && view.ambientEvent(event)) Sound.ambientEvent(event);
  }
  // cuckoo clocks call the hour on their own, like the wall clock tells real time
  let lastHour = new Date().getHours();
  setInterval(() => {
    const h = new Date().getHours();
    if (h === lastHour) return;
    lastHour = h;
    room.items.filter(i => i.t === 'cuckoo').forEach((i, k) => setTimeout(() => cuckoo(i.id), k * 400));
    if (room.items.some(i => CAT[i.t].anim === 'clock' || CAT[i.t].tap === 'time')) Sound.hourChime();
  }, 15000);
  const CH_NAMES = {
    code: 'Coding…', game: 'Pixel Run', viz: 'Music visualizer', fish: 'Fish screensaver', cartoon: 'Cartoons', nature: 'Nature channel',
    news: 'Evening news', retro: 'Retro pong', static: 'Static…', arcade: 'Star Raiders', movie: 'Movie night',
  };
  function sleep() {
    const dream = $('#dream');
    const wasLate = meta.phase === 'night' || meta.phase === 'evening';
    dream.classList.add('on'); Sound.purr(false);
    setTimeout(() => {
      meta.realtime = false; setPhase('morning', true);
      setTimeout(() => {
        dream.classList.remove('on');
        toast('<b>Good morning ☀</b><span>Time follows the clock again in Settings</span>', 2600);
        if (wasLate) discover('sleep');
      }, 900);
    }, 1400);
  }
  // the radio: station 1 is the built-in lofi band (offline, always works), then any stream links you've
  // added in the menu, then off. Tapping a record player steps through them.
  const stationList = () => [{ name: 'Lofi radio', gen: true }].concat((meta.stations || []).filter(x => x && x.url));
  let stream = null, duckT = 0, failedAt = -1;   // failedAt: a dead station fell back to Lofi radio, so the next tap moves on past it
  function stopStream() {
    if (stream) { stream.onerror = null; try { stream.pause(); } catch (e) { /* already stopped */ } stream.removeAttribute('src'); stream = null; }
    Sound.setStream(false);
  }
  function playStation(i, quiet) {
    const list = stationList();
    Sound.init(); failedAt = -1;
    if (i == null || i < 0 || i >= list.length) {   // off
      stopStream(); meta.station = -1; meta.music = false;
      Sound.setMusic(false); view.music = false; saveMeta(); updateHeader();
      if (!quiet) toast('<span>Radio off</span>', 1000, true);
      return;
    }
    const st = list[i];
    meta.station = i; meta.lastStation = i; meta.music = true;
    stopStream();
    if (st.gen) Sound.setMusic(true);
    else {
      Sound.setMusic(false);
      // try the link as pasted, then once over the other scheme: plenty of Icecast servers only answer on
      // one of them, or redirect a secure link to a plain one (which Android's WebView won't follow)
      const urls = [st.url, st.url.replace(/^https?:/i, m => (m.toLowerCase() === 'https:' ? 'http:' : 'https:'))];
      const why = e => { const code = stream && stream.error && stream.error.code; return code === 2 ? 'network error' : code === 4 ? 'no stream at that link' : e && e.name === 'NotAllowedError' ? 'playback blocked' : 'no answer'; };
      const tryUrl = k => {
        stream = new Audio(); stream.volume = letters.active || barnaby.active ? .45 : 1; stream.preload = 'none'; stream.src = urls[k];
        const me = stream;
        const fail = e => {
          if (stream !== me) return;
          if (k + 1 < urls.length && (!e || e.name !== 'NotAllowedError')) { me.onerror = null; try { me.pause(); } catch (x) { /* already stopped */ } tryUrl(k + 1); return; }
          const reason = why(e);
          stopStream(); toast(`<span>Can’t reach ${st.name} (${reason}), back to Lofi radio</span>`, 2600, true); playStation(0, true); failedAt = i;
        };
        me.onerror = () => fail(null);
        const pr = me.play(); if (pr && pr.catch) pr.catch(fail);
      };
      tryUrl(0);
      Sound.setStream(true); Sound.needle();
    }
    view.music = true; saveMeta(); updateHeader();
    room.items.forEach(x => { if (CAT[x.t].tap === 'music') view.boing(x.id); });
    discover('lofi');
    if (!quiet) toast(`<span>♪ ${st.name}</span>`, 1400, true);
  }
  function nextStation() {
    const n = stationList().length, cur = !meta.music ? -1 : failedAt > 0 && meta.station === 0 ? failedAt : meta.station;
    playStation(cur + 1 >= n ? -1 : cur + 1);
  }
  function toggleRadio() { if (meta.music) playStation(-1); else playStation(Math.min(meta.lastStation || 0, stationList().length - 1)); }
  // the jukebox, vinyl and moods belong to the built-in band
  function setMusic(on) { playStation(on ? 0 : -1); }
  // interaction sounds get a little room: the music dips for a moment
  function duck() {
    Sound.duck();
    if (stream) { stream.volume = 0.6; clearTimeout(duckT); duckT = setTimeout(() => { if (stream) stream.volume = letters.active || barnaby.active ? .45 : 1; }, 450); }
  }

  // the record crate: flip through sleeves like a real collection; each record is a mood of the band
  let crateOpen = false, crateI = 0, crateSeen = new Set();
  const sleeves = () => Sound.moods.map((M, k) => ({ k, name: M.name, sub: `${M.bpm} bpm`, col: M.col })).concat([{ k: 'auto', name: 'Follow the day', sub: 'changes with the time', col: '#e8dcc4' }]);
  function layoutCrate() {
    const els = [...$('#crateBin').querySelectorAll('.sleeve')];
    els.forEach((el, i) => {
      const d = i - crateI;
      el.style.transform = d < 0 ? `translateY(${70 - d * 4}px) translateZ(${-d * 6}px) rotateX(-78deg)`   // already flipped past, lying forward
        : d === 0 ? 'translateY(-40px) rotateX(-4deg)'                                                    // the one you're looking at, lifted a little
          : `translateY(${-64 - d * 14}px) translateZ(${-d * 30}px) rotateX(14deg)`;                       // still waiting behind, tops peeking over
      el.style.zIndex = 100 - Math.abs(d) + (d === 0 ? 50 : 0);
      el.style.opacity = d < -2 || d > 6 ? 0 : 1;
      el.style.filter = d > 0 ? `brightness(${1 - d * 0.07})` : '';
      el.classList.toggle('front', d === 0);
    });
    const S = sleeves()[crateI], cur = meta.mood === 'auto' ? 'auto' : meta.mood;
    $('#crateNow').textContent = meta.music && S.k === cur ? 'Now playing' : 'Tap the record to play it';
  }
  function flipCrate(dir) {
    const n = sleeves().length, j = Math.max(0, Math.min(n - 1, crateI + dir));
    if (j === crateI) { Sound.nope(); return; }
    crateI = j; crateSeen.add(j); layoutCrate(); Sound.flip();
    if (crateSeen.size >= n) discover('digger');
  }
  function openCrate() {
    const bin = $('#crateBin'); bin.innerHTML = '';
    sleeves().forEach((S, i) => {
      const el = document.createElement('button'); el.className = 'sleeve'; el.dataset.k = S.k; el.style.setProperty('--c', S.col);
      el.innerHTML = `<i class="disc"></i><span class="cover"></span><span class="art"></span><b>${S.name}</b><small>${S.sub}</small>`;
      el.onclick = () => { if (i === crateI) playSleeve(S); else { crateI = i; crateSeen.add(i); layoutCrate(); Sound.flip(); } };
      bin.appendChild(el);
    });
    crateI = Math.max(0, sleeves().findIndex(S => S.k === meta.mood)); crateSeen = new Set([crateI]);
    $('#crate').classList.add('open'); crateOpen = true; layoutCrate(); Sound.flip();
  }
  function closeCrate() { $('#crate').classList.remove('open'); crateOpen = false; }
  function playSleeve(S) {
    meta.mood = S.k; meta.moodSet = true;
    const name = (S.k === 'auto' ? 'Follow the day · ' : '') + applyMood();
    moodsPlayed.add(Sound.mood); if (moodsPlayed.size >= 3) discover('mixtape');
    if (meta.station !== 0 || !meta.music) playStation(0, true); else saveMeta();
    Sound.needle(); discover('lofi');
    const el = $('#crateBin').querySelectorAll('.sleeve')[crateI]; if (el) el.classList.add('pulled');
    toast(`<span>♪ ${name}</span>`, 1600, true);
    setTimeout(() => { closeCrate(); if (el) el.classList.remove('pulled'); }, 650);
  }
  // Handle the top sheet before crate navigation, text fields or cat-view controls.
  window.addEventListener('keydown', e => {
    if (!$('#sheet').classList.contains('open') || letters.active || frenchUI?.active) return;
    // Let an open native picker handle Escape and its own keyboard navigation.
    try { if (document.querySelector('select:open')) return; } catch (_) {}
    const futureDetails=$('.future-mail-details[open]');
    if(e.key==='Escape'&&futureDetails){e.preventDefault();futureDetails.open=false;futureDetails.querySelector('summary').focus();e.stopImmediatePropagation();return;}
    if(e.key==='Escape'&&$('#sheetBody .mood-panel:not([hidden])'))return;
    if(e.target.closest?.('.home-sort-menu'))return;   // the Sort tools menu owns its Escape/arrow keys
    if(e.target.matches('.compact-date input[type=date]')&&['Enter',' '].includes(e.key))return;
    if(e.target.matches('.today-feature-toggle')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    if(e.target.matches('.today-widget')&&['Enter',' '].includes(e.key))return;
    if(e.target.matches('.today-widget-handle')&&['ArrowUp','ArrowDown'].includes(e.key))return;
    if(e.key==='Escape'&&e.target.closest('.today-weather')?.querySelector('.today-widget-stack.is-arranging'))return;
    if(e.target.matches('.pixel-grid')&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' ','z','Z'].includes(e.key))return;
    const typing = e.target.matches('input, textarea, select') || e.target.isContentEditable;
    const menuShortcut = !typing && !e.ctrlKey && !e.metaKey && !e.altKey && ['h','?'].includes(e.key.toLowerCase()) && !!$('#menu-today');
    const expandedSearch=$('#sheetBody .space-search.is-expanded');
    if(e.key==='Escape'&&expandedSearch){e.preventDefault();expandedSearch.dispatchEvent(new Event('search-collapse'));}
    else if (e.key === 'Escape' || menuShortcut) { e.preventDefault(); closeSheets(); }
    else if(e.key==='Tab'&&home.active){
      const nodes=[...$('#sheetBody').querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(n=>!n.disabled&&n.tabIndex>=0&&n.getClientRects().length),first=nodes[0],last=nodes.at(-1);
      if(first&&(!sheet.contains(document.activeElement)||e.shiftKey&&document.activeElement===first||!e.shiftKey&&document.activeElement===last)){e.preventDefault();(e.shiftKey?last:first).focus();}
    }
    else LRDashboard.tabKey(e);
    e.stopImmediatePropagation();
  }, true);
  (function crateInput() {
    const bin = $('#crateBin'); let sx = 0, sy = 0, moved = false;
    bin.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; moved = false; });
    bin.addEventListener('pointerup', e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) { moved = true; flipCrate(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 1 : -1) : (dx < 0 ? 1 : -1)); } });
    bin.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    bin.addEventListener('wheel', e => { e.preventDefault(); flipCrate(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    $('#crate').addEventListener('click', e => { if (e.target.id === 'crate') closeCrate(); });
    $('#crateClose').onclick = () => closeCrate();
    $('#cratePrev').onclick = () => flipCrate(-1); $('#crateNext').onclick = () => flipCrate(1);
    window.addEventListener('keydown', e => {
      if (!crateOpen || letters.active || barnaby.active || frenchUI?.active) return;
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowRight') flipCrate(1); else if (k === 'ArrowUp' || k === 'ArrowLeft') flipCrate(-1);
      else if (k === 'Enter' || k === ' ') playSleeve(sleeves()[crateI]); else if (k === 'Escape') closeCrate(); else return;
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
  })();

  // dream mode: after midnight (at night) the room drifts: moon-blue light, floating motes, a slower, softer band
  let drifting = false;
  const driftNow = () => meta.dreamy !== false && meta.phase === 'night' && new Date().getHours() < 5;
  function checkDrift(quiet, force) {
    const on = force != null ? force : driftNow();
    view.driftGoal = on ? LRCozyFurniture.dreamStrength(room.items, CAT) : 0;
    if (on === drifting) return;
    drifting = on; Sound.dreamy = on;
    document.body.classList.toggle('drift', on);
    if (on && !quiet) { toast('<b>☾ Dream mode</b><span>It’s past midnight. The room drifts…</span>', 3400); discover('dreamer'); }
  }

  // ---------------------------------------------------------------
  // Input
  const canvas = $('#c');
  const pointers = new Map();
  let gesture = null, orbit = null, lastTap = null;

  function beginEdit(e) {
    const tool = state.tool;
    if (tool === 'add') {
      const C = CAT[state.add];
      const base = { t: state.add, c: 0, r: state.addR || 0, on: C.on !== undefined ? C.on : false };
      if (state.add === 'cat') base.c = (room.count(i => i.t === 'cat' && !i.visitor)) % 5;
      const cand = candidate(e.clientX, e.clientY, base);
      if (!cand) { startOrbit(e); return; }
      state.drag = { kind: 'add', base, cand, sx: e.clientX, sy: e.clientY };
      view.setGhost(cand, room.canPlace(cand), room);
      return;
    }
    const hit = view.pickItem(e.clientX, e.clientY);
    if (tool === 'move' && hit && !hit.behindWall) {
      const it = room.get(hit.id), C = CAT[it.t];
      let grab;
      if (C.kind === 'wall') { const w = view.pickWall(e.clientX, e.clientY, true); grab = w ? { u: w.u - it.u, e: w.e - it.e } : { u: CAT[it.t].size[0] / 2, e: CAT[it.t].size[1] / 2 }; }
      else if (C.kind !== 'small' || !it.p) { const p = view.pickFloor(e.clientX, e.clientY); const ix = C.kind === 'pet' ? Math.floor(view.pets.get(it.id).x) : it.x, iz = C.kind === 'pet' ? Math.floor(view.pets.get(it.id).z) : it.z; grab = C.kind === 'small' ? null : { x: p.x - ix, z: p.z - iz }; }
      state.drag = { kind: 'move', id: it.id, base: Object.assign({}, it), grab, cand: null, sx: e.clientX, sy: e.clientY };
      setHidden(it.id);
      const cand = candidate(e.clientX, e.clientY, it, grab);
      state.drag.cand = cand;
      if (cand) view.setGhost(cand, room.canPlace(cand, it.id), room);
      Sound.lift(); haptic(6);
      return;
    }
    // turn / paint / remove act on a tap; a drag spins the view instead
    startOrbit(e, hit && !hit.behindWall ? hit.id : 0);
  }
  // ---------------------------------------------------------------
  // Item-to-item: drop one thing onto another with Move and they do something together
  const nameOf = it => it.t === 'cat' ? (it.name || (CATS[it.c] || CATS[0]).name) : CAT[it.t].name.toLowerCase();
  const COMBOS = [
    { from: a => a.t === 'shopcrown' && shop.owns('crown'), to: b => b.t === 'cat' && !b.visitor, hint: 'Drop to put on or take off the crown',
      run(a, b) { dressCat(b); } },
    { from: a => ['mug', 'teacup', 'barlatte'].includes(a.t), to: b => CAT[b.t].tap === 'brew', hint: 'Drop to fill it up',
      run(a, b) { view.burst(b.id, 'steam', 3.5); Sound.gurgle(8); setTimeout(() => Sound.pour(), 500); view.burst(a.id, 'steam', 4); toast('<span>Fresh cup, still steaming ☕</span>', 1500); discover('barista'); } },
    { from: a => CAT[a.t].group === 'plants', to: b => CAT[b.t].tap === 'sink', hint: 'Drop to water it',
      run(a) { if (care) care.tap(a, a.id); Sound.water(); view.burst(a.id, 'drip', 2); view.sparkle(view.itemPoint(a.id, [4, 12, 4]), 0xa8f0a0, 12); toast('<span>Watered! It perks right up</span>', 1400); } },
    { from: a => a.t === 'vinyl', to: b => CAT[b.t].tap === 'mood' || (CAT[b.t].tap === 'music' && CAT[b.t].anim === 'record'), hint: 'Drop to play this record',
      run(a, b) { const name = Sound.setMood(a.c | 0); meta.mood = Sound.mood; meta.moodSet = true; moodsPlayed.add(Sound.mood); if (moodsPlayed.size >= 3) discover('mixtape'); if (meta.station !== 0 || !meta.music) playStation(0, true); else saveMeta(); Sound.needle(); view.excite(b.id); toast(`<span>Now playing: ${name}</span>`, 1600); discover('lofi'); } },
    { from: a => a.t === 'treats', to: b => b.t === 'cat', hint: 'Drop to give a treat',
      run(a, b) { remember('cat');view.feedCat(b.id); Sound.crunch(); Sound.purr(true); setTimeout(() => Sound.purr(false), 2400); toast(`<span>${nameOf(b)} munches happily ♥</span>`, 1500); discover('feast'); } },
    { from: a => a.t === 'blanket', to: b => !!CAT[b.t].nap && !b.p && !b.blanket, hint: 'Drop to tuck it in',
      run(a, b) { pushUndo(); b.blanket = true; room.remove(a.id); changed(); view.poof(b.id, [0xc8484a, 0xf4e8d4]); Sound.place(); toast('<span>All tucked in. Naps here last longer</span>', 1600); } },
    { from: a => a.t === 'fishfood', to: b => !!CAT[b.t].tank, hint: 'Drop to feed the fish',
      run(a, b) { if (!view.feedFish(b.id)) view.excite(b.id); Sound.plop(); toast('<span>Dinner time for the fish!</span>', 1300); discover('fish'); } },
  ];
  function comboAt(cx, cy, d) {
    const a = room.get(d.id);
    if (!a) return null;
    const hit = view.pickItem(cx, cy, [d.id, ...room.descendants(d.id).map(i => i.id)]);
    if (!hit || hit.behindWall) return null;
    for (let b = room.get(hit.id), k = 0; b && k < 2; b = b.p ? room.get(b.p) : null, k++) {
      const c = COMBOS.find(c => c.from(a) && c.to(b));
      if (c) return { c, b };
    }
    return null;
  }
  function moveEdit(e) {
    const d = state.drag;
    if (!d) return;
    if (d.kind === 'move') {
      const combo = comboAt(e.clientX, e.clientY, d);
      if ((combo && combo.b.id) !== (d.combo && d.combo.b.id)) {
        d.combo = combo;
        view.setHover(combo ? combo.b.id : 0, 0x9ae8ff);
        if (combo) { view.setGhost(null); toast(`<span>${combo.c.hint}</span>`, 1000, true); haptic(4); }
      }
      if (combo) return;
    }
    const base = d.kind === 'add' ? d.base : d.base;
    const cand = candidate(e.clientX, e.clientY, base, d.kind === 'move' ? d.grab : null);
    if (!cand) return;
    d.cand = cand;
    view.setGhost(cand, room.canPlace(cand, d.kind === 'move' ? d.id : undefined), room);
  }
  function endEdit() {
    const d = state.drag;
    state.drag = null;
    if (!d) return;
    view.setGhost(null);
    if (d.kind === 'add') {
      if (d.cand && room.canPlace(d.cand)) {
        pushUndo();
        const it = room.add(room.make(d.cand.t, d.cand));
        if (it.t === 'appportal' && pendingPortal) { try { files.bind(`${meta.current}:${it.id}`,pendingPortal); } catch(e) { toast('<span>Placed the portal. Choose its destination when you tap it.</span>',2200); } pendingPortal=null; }
        changed();
        view.boing(it.id); view.poof(it.id, [0xffffff, 0xfff0d0]);
        Sound.place(weightOf(it)); duck(); haptic(8);
        if (it.t === 'cat') toast(`<span>Say hi to ${(CATS[it.c] || CATS[0]).name}!</span>`, 1600);
      } else { Sound.nope(); toast('<span>That spot is taken</span>', 1100); }
    } else if (d.kind === 'move' && d.combo) {
      setHidden(0); view.setHover(0);
      const a = room.get(d.id);
      if (a && room.get(d.combo.b.id)) { toastQ.length = 0; toastBusy = 0; d.combo.c.run(a, d.combo.b); view.boing(d.combo.b.id); haptic(8); }
    } else if (d.kind === 'move') {
      setHidden(0);
      const it = room.get(d.id);
      if (it && d.cand && room.canPlace(d.cand, d.id)) {
        const same = ['x', 'z', 'k', 'u', 'e', 'p', 'lx', 'lz'].every(k => d.cand[k] === d.base[k] || (d.cand[k] == null && d.base[k] == null));
        if (!same) { pushUndo(); applyPlacement(it, d.cand); changed(); Sound.place(weightOf(it)); view.boing(it.id); haptic(6); }
      } else if (d.cand) { Sound.nope(); toast('<span>That spot is taken</span>', 1100); }
    }
  }
  function tapEdit(id) {
    const it = room.get(id);
    if (!it) return;
    const C = CAT[it.t];
    if (state.tool === 'remove') {
      pushUndo();
      view.poof(id, [0xf4e6d0, 0xffffff, 0xd8c8b8]);
      const gone = room.remove(id);
      gone.filter(it=>['focusgarden','focusbloom'].includes(it.t)).forEach(it=>focusGarden.detach(meta.current,it.id));
      changed(); Sound.poof(); haptic(8);
      if (gone.length > 1) toast(`<span>Put away ${C.name.toLowerCase()} and ${gone.length - 1} thing${gone.length > 2 ? 's' : ''} on it</span>`, 1600);
    } else if (state.tool === 'paint') {
      pushUndo();
      it.c = ((it.c | 0) + 1) % C.vars.length;
      changed(); view.boing(id); Sound.tick2(); haptic(5);
      if (it.t === 'cat') toast(`<span>This is ${(CATS[it.c] || CATS[0]).name}</span>`, 1300);
    } else if (state.tool === 'turn') {
      if (C.kind === 'wall') { toast('<span>Wall pieces stay flat against the wall</span>', 1300); Sound.nope(); return; }
      pushUndo();
      if (C.kind === 'small' || C.kind === 'pet') { it.r = ((it.r || 0) + 1) % 4; changed(); view.boing(id); Sound.turn(); return; }
      const [fw, fd] = fp(it), cx = it.x + fw / 2, cz = it.z + fd / 2;
      const nr = ((it.r || 0) + 1) % 4, t = Object.assign({}, it, { r: nr }), [nw, nd] = fp(t);
      const tries = [[0, 0], [0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]];
      for (const [ox, oz] of tries) {
        t.x = Math.round(cx - nw / 2) + ox; t.z = Math.round(cz - nd / 2) + oz;
        if (room.canPlace(t, it.id)) { it.r = nr; it.x = t.x; it.z = t.z; changed(); view.boing(id); Sound.turn(); haptic(5); return; }
      }
      undo.pop(); Sound.nope(); toast('<span>No room to turn it here</span>', 1200);
    } else if (state.tool === 'move') {
      // handled on drag
    }
  }

  function startOrbit(e, tapId) {
    orbit = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), tapId: tapId || 0, moved: false };
  }
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    Sound.init(); if (Sound.ctx && Sound.ctx.state === 'suspended' && Sound.on) Sound.ctx.resume();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    closeSheets();
    if (pointers.size === 2) {
      // second finger: a camera gesture, so drop whatever the first finger started
      if (state.drag) { if (state.drag.kind === 'move') setHidden(0); state.drag = null; view.setGhost(null); }
      orbit = null;
      const [a, b] = [...pointers.values()];
      gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, zoom: view.zoomGoal };
      return;
    }
    if (pointers.size > 2) return;
    if (e.button === 2 || e.button === 1 || e.altKey) { orbit = { x: e.clientX, y: e.clientY, pan: e.button === 1 }; return; }
    if (state.mode === 'explore') {
      const hit = view.pickItem(e.clientX, e.clientY);
      const paperTap=driftPaper.hit(e.clientX,e.clientY);
      const botTap = !paperTap && companion && companion.hit(e.clientX, e.clientY);
      startOrbit(e, !paperTap && !botTap && hit && !hit.behindWall ? hit.id : 0);
      if(paperTap)orbit.digest=true;
      if (botTap) orbit.companion = true;
      return;
    }
    beginEdit(e);
  });
  canvas.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture && pointers.size >= 2 && view.fp) return;
    if (gesture && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      view.zoomGoal = Math.max(0.7, Math.min(room.n > 14 ? 4.5 : 3, gesture.zoom * d / gesture.d));
      let da = ang - gesture.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      view.yawGoal -= da; gesture.ang = ang;
      panBy(mx - gesture.mx, my - gesture.my); gesture.mx = mx; gesture.my = my;
      return;
    }
    if (orbit) {
      const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
      if (!orbit.moved && orbit.sx !== undefined && Math.hypot(e.clientX - orbit.sx, e.clientY - orbit.sy) < 8) return;
      orbit.moved = true;
      orbit.x = e.clientX; orbit.y = e.clientY;
      if (view.fp) { view.fp.look -= dx * 0.006; view.fp.pitch = Math.max(-0.9, Math.min(0.75, view.fp.pitch + dy * 0.005)); }   // look around
      else if (orbit.pan) panBy(dx, dy);
      else { view.yawGoal -= dx * 0.008; view.pitchGoal = Math.max(0.3, Math.min(1.2, view.pitchGoal + dy * 0.005)); }
      return;
    }
    if (state.drag) { moveEdit(e); return; }
    // desktop: preview the piece under the mouse, outline what a tool would act on
    if (e.pointerType === 'mouse' && !pointers.size) { mouse = { x: e.clientX, y: e.clientY }; hoverSoon(); }
  });
  let mouse = null, hoverT = 0;
  function hoverSoon() {
    if (hoverT) return;
    hoverT = requestAnimationFrame(() => { hoverT = 0; updateHover(); });
  }
  function refreshGhost() { if (mouse) updateHover(); }
  function updateHover() {
    if (!mouse || state.drag || orbit) return;
    if (state.mode === 'edit' && state.tool === 'add') {
      const C = CAT[state.add];
      const cand = candidate(mouse.x, mouse.y, { t: state.add, c: state.add === 'cat' ? room.count(i => i.t === 'cat' && !i.visitor) % 5 : 0, r: state.addR || 0, on: C.on !== undefined ? C.on : false });
      if (cand) view.setGhost(cand, room.canPlace(cand), room); else view.setGhost(null);
      view.setHover(0); canvas.style.cursor = cand ? 'crosshair' : 'grab';
      return;
    }
    const hit = view.pickItem(mouse.x, mouse.y);
    const id = hit && !hit.behindWall ? hit.id : 0;
    if (state.mode === 'edit') {
      view.setHover(id, state.tool === 'remove' ? 0xff6a6a : state.tool === 'paint' ? 0x9ae8ff : 0xffffff);
      canvas.style.cursor = id ? (state.tool === 'move' ? 'grab' : 'pointer') : 'grab';
    } else {
      view.setHover(0);
      const it = id && room.get(id);
      canvas.style.cursor = (it && CAT[it.t].tap) || (companion && companion.hit(mouse.x, mouse.y)) || driftPaper.hit(mouse.x,mouse.y) ? 'pointer' : 'grab';
    }
  }
  const up = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) gesture = null;
    if (orbit && orbit.t0 && e.type === 'pointerup' && pointers.size === 0 && !orbit.moved && performance.now() - orbit.t0 < 450) {
      if(orbit.digest){driftPaper.open();lastTap=null;}
      else if (orbit.tapId) {
        if (state.mode === 'explore') interact(orbit.tapId, view.pickItem(e.clientX, e.clientY)); else tapEdit(orbit.tapId);
        lastTap = null;
      } else if (orbit.companion && companion) {
        const hit = view.pickItem(e.clientX, e.clientY);
        const it = hit && room.get(hit.id);
        if (hit && !hit.behindWall && it && (CAT[it.t].tap || CAT[it.t].kind === 'pet')) interact(hit.id, hit);
        else if (companion.hit(e.clientX, e.clientY)) companion.tap();
        lastTap = null;
      } else if (state.mode === 'explore' && view.fp) {
        const p = view.pickFloor(e.clientX, e.clientY);
        if (p && view.walkCatTo(view.fp.id, Math.floor(p.x), Math.floor(p.z))) { const P = view.pets.get(view.fp.id); if (P) P.manual = 0; }
      } else if (state.mode === 'explore' && follow && performance.now() < follow.until) {
        const p = view.pickFloor(e.clientX, e.clientY);
        if (p && view.walkCatTo(follow.id, Math.floor(p.x), Math.floor(p.z))) { follow.until = performance.now() + 6000; view.sparkle(new THREE.Vector3(Math.floor(p.x) + 0.5, 0.1, Math.floor(p.z) + 0.5), 0xffd0e0, 6); }
      } else if (state.mode === 'explore') {
        const now = performance.now();
        if (lastTap && now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { zoomToward(e.clientX, e.clientY); lastTap = null; }
        else lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    }
    if (pointers.size === 0) { orbit = null; if (e.type === 'pointerup') endEdit(); else if (state.drag) { if (state.drag.kind === 'move') setHidden(0); state.drag = null; view.setGhost(null); } }
  };
  function zoomToward(cx, cy) {
    const p = view.pickFloor(cx, cy);
    if (!p || view.zoomGoal > 2.2 || p.x < 0 || p.z < 0 || p.x > room.n || p.z > room.n) { view.zoomGoal = 1; view.panGoal.set(0, 0, 0); return; }
    view.panGoal.set(p.x - room.n / 2, 0, p.z - room.n / 2);
    view.zoomGoal = Math.min(room.n > 14 ? 4.5 : 3, view.zoomGoal * 1.7);
    haptic(5);
  }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !state.drag) { view.setGhost(null); view.setHover(0); mouse = null; } });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (view.fp) { view.fpCam.fov = Math.max(45, Math.min(90, view.fpCam.fov + e.deltaY * 0.03)); view.placeCamera(); return; }
    view.zoomGoal = Math.max(0.7, Math.min(room.n > 14 ? 4.5 : 3, view.zoomGoal * Math.exp(-e.deltaY * 0.0015)));
  }, { passive: false });

  function panBy(dx, dy) {
    const cam = view.cam;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const upv = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const s = 1 / (view.ppu * view.zoom);
    view.panGoal.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
    if (view.panGoal.length() > room.n * 0.8) view.panGoal.setLength(room.n * 0.8);
  }

  window.addEventListener('keydown', e => {
    if (library.active || letters.active || barnaby.active || frenchUI?.active || sheet.classList.contains('open')) return;   // writing and sheets own keyboard focus
    if (rituals.breath.active) { if (e.key === 'Escape') stopBreathing(); return; }
    if (e.target.matches('input, textarea, select') || e.target.isContentEditable) return;
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doUndo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // leave browser shortcuts like Ctrl+R alone
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (view.fp) {   // cat view: WASD or the arrows walk, Q/E look around, C or Esc goes back
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) { e.preventDefault(); held.add(key); return; }
      if (key === 'q') { view.fp.look += 0.35; return; }
      if (key === 'e') { view.fp.look -= 0.35; return; }
      if (key === 'Escape' || key === 'c') { exitCat(); return; }
      if (key === 'n') { nextCat(); return; }
    } else if (key === 'c' && state.mode === 'explore') { enterCat(); return; }
    const trayOpen = tray.classList.contains('open');
    const keys = { 1: 'add', 2: 'move', 3: 'turn', 4: 'paint', 5: 'remove' };
    if (keys[key]) { if (state.mode === 'explore') setMode('edit', true); document.querySelector(`.tools [data-tool="${keys[key]}"]`).click(); }
    else if (key === 'ArrowRight' && trayOpen) { e.preventDefault(); stepTray(1); }
    else if (key === 'ArrowLeft' && trayOpen) { e.preventDefault(); stepTray(-1); }
    else if ((key === 'ArrowDown' || key === ']') && trayOpen) { e.preventDefault(); stepTab(1); }
    else if ((key === 'ArrowUp' || key === '[') && trayOpen) { e.preventDefault(); stepTab(-1); }
    else if (key === 'r') turnKey();
    else if ((key === 'Delete' || key === 'Backspace') && state.mode === 'edit' && view.hoverId) { const t = state.tool; state.tool = 'remove'; tapEdit(view.hoverId); state.tool = t; view.setHover(0); refreshGhost(); }
    else if (key === 'x') setMode(state.mode === 'explore' ? 'edit' : 'explore');
    else if (key === 'g') surprise();
    else if (key === 'q') rotate(-1);
    else if (key === 'e') rotate(1);
    else if (key === 'm') toggleRadio();
    else if (key === 'u') doUndo();
    else if (key === '?' || key === 'h') { $('#bMenu').click(); }
    else if (key === 'Escape') {
      if (state.drag) { if (state.drag.kind === 'move') setHidden(0); state.drag = null; view.setGhost(null); }
      else if (filming) filmCancel = true;
      else if (crateOpen) closeCrate();
      else if (sheet.classList.contains('open') || $('#photo').classList.contains('open')) { closeSheets(); closePhoto(); }
      else if (state.mode === 'edit') setMode('explore');
    }
  });
  // R: spin the piece you're about to place, or the one under the mouse
  function turnKey() {
    if (state.mode === 'edit' && state.tool === 'add') {
      const C = CAT[state.add];
      if (C.kind === 'wall') { toast('<span>Wall pieces stay flat against the wall</span>', 1200); return; }
      state.addR = ((state.addR || 0) + 1) % 4; Sound.turn(); refreshGhost();
      return;
    }
    if (state.mode === 'edit' && view.hoverId) { const t = state.tool; state.tool = 'turn'; tapEdit(view.hoverId); state.tool = t; refreshGhost(); return; }
    rotate(1);
  }

  function rotate(dir) {
    const q = Math.PI / 2;
    view.yawGoal = Math.round((view.yawGoal - Math.PI / 4) / q) * q + Math.PI / 4 + dir * q;
    Sound.turn();
  }
  $('#rotL').onclick = () => rotate(-1);
  $('#rotR').onclick = () => rotate(1);
  $('#bUndo').onclick = doUndo;

  // ---------------------------------------------------------------
  // Time and weather
  const PHASE_ORDER = ['morning', 'day', 'evening', 'night'];
  const PHASE_NAMES = { morning: 'Morning', day: 'Afternoon', evening: 'Evening', night: 'Night' };
  function setPhase(p, quiet) {
    if (p === meta.phase && view.env.phase === p) return;
    meta.phase = p; saveMeta();
    view.setPhase(p); view.refreshEnv(p);
    if (meta.mood === 'auto') applyMood();
    setTimeout(() => checkDrift(), 50);
    updateHeader();
    if (!quiet) toast(`<span>${PHASE_NAMES[p]}${meta.realtime ? '' : ' · Settings has “Follow the clock”'}</span>`, 1300);
    setTimeout(checkRoomMoments, 2600);
    setTimeout(()=>villageView?.refresh(),2600);
  }
  $('#bTime').onclick = () => { meta.realtime = false; setPhase(PHASE_ORDER[(PHASE_ORDER.indexOf(meta.phase) + 1) % 4]); Sound.turn(); };
  // Background weather supports clear, rain, storm and snow.
  const WEATHERS = LRWeather.STATES;
  const liveWeather = LRWeather.create({meta,save:()=>saveMeta(),applyWeather,notice:text=>toast(`<span>${esc(text)}</span>`,2800,true),changed:()=>{const settings=$('#menu-settings');if(sheet.classList.contains('open') && settings && !settings.hidden)renderMenu();}});
  const WEATHER_SAY = { clear: 'Clear skies', rain: 'Rain on the window…', storm: 'A storm rolls in', snow: 'It’s snowing' };
  function applyWeather(w, quiet) {
    meta.weather = WEATHERS.includes(w) ? w : 'clear';
    meta.raining = meta.weather === 'rain' || meta.weather === 'storm';
    view.weatherIntensity=meta.liveWeather?LRWeather.intensity(meta.weatherDetails):1;
    view.setWeather(meta.weather); view.setRain(meta.raining); view.refreshEnv(meta.phase);
    if (meta.mood === 'auto') applyMood();
    document.body.classList.toggle('raining', meta.raining);
    if (quiet) return;
    saveMeta(); Sound.init(); updateHeader();
    toast(`<span>${WEATHER_SAY[meta.weather]}</span>`, 1400, true);
    if (meta.raining) discover('rain');
    if (meta.weather === 'storm') setTimeout(() => view.strike(), 900);
  }
  (function musicShortcut(){
    const button=$('#bMusic');let timer=null,pointer=null,held=false,start=null;
    const clear=()=>{if(timer!==null)clearTimeout(timer);timer=null;pointer=null;};
    const openSound=()=>{if(held)return;held=true;clear();store.set('lr.menuTab','Sound');renderMenu();openSheet();$('#menu-sound-tab')?.focus({preventScroll:true});};
    button.title='Lofi radio (M) · Hold to open Sound';
    button.setAttribute('aria-description','Tap to toggle music. Press and hold to open Sound.');
    button.addEventListener('pointerdown',e=>{if(e.button!==0)return;clear();held=false;pointer=e.pointerId;start={x:e.clientX,y:e.clientY};timer=setTimeout(openSound,550);});
    button.addEventListener('pointermove',e=>{if(pointer===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)clear();});
    for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,clear);
    button.addEventListener('contextmenu',e=>{e.preventDefault();if(pointer!==null)openSound();});
    button.onclick=e=>{if(held){held=false;if(e.detail>0){e.preventDefault();return;}}toggleRadio();};
  })();

  // ---------------------------------------------------------------
  // Rooms list & menu
  const sheet = $('#sheet');
  let shareQR=null,roomScanner=null;
  function releaseRoomQR(){shareQR?.destroy();shareQR=null;roomScanner?.destroy();roomScanner=null;}
  function openSheet() {
    sheet.inert = false; sheet.setAttribute('aria-hidden','false'); sheet.classList.add('open');
    $('#bMenu').setAttribute('aria-expanded',String(!!$('#menu-today')));
  }
  function closeSheets() {
    if(frenchUI?.active){frenchUI.close();return;}
    if(letters.active){letters.close();return;}
    if(home.active){home.close();return;}
    releaseRoomQR();
    villageView?.destroy(); villageView=null;
    roomToolsUI.close();
    const open = sheet.classList.contains('open');
    const returnFocus = sheet.contains(document.activeElement);
    sheet.classList.remove('open'); sheet.inert = true; sheet.setAttribute('aria-hidden','true');
    $('#bMenu').setAttribute('aria-expanded','false'); $('#sheetBody').dataset.merchant = '';delete $('#sheetBody').dataset.dashboardFont;
    if (returnFocus) $('#bMenu').focus({preventScroll:true});
    // Dismissal and the pending room transition must survive an unavailable audio device.
    if (open) { try { Sound.slide(false); } catch (e) { /* optional interface sound */ } }
  }
  function breathingSheet() {
    const body = $('#sheetBody'); body.dataset.merchant = '';
    delete body.dataset.tool; body.innerHTML = '<div class="grab"></div><h2>Ten minutes in your room</h2><p class="muted">Moon-blue light, a slow circle, a gentle tone. Breathe in as it opens, out as it softens. Four seconds in, six out, or simply follow at your own pace. Keep your eyes open. Leave whenever you like.</p><div class="rowbtns"><button class="chipbtn primary" id="breathStart">Settle in</button><button class="chipbtn" id="breathNotNow">Back</button></div>';
    $('#breathStart').onclick = startBreathing; $('#breathNotNow').onclick = closeSheets; openSheet();
  }
  function startBreathing() {
    if (rituals.breath.active) return;
    closeSheets(); closePhoto(); exitCat(true); setMode('explore', true);
    breathCamera = { pan: view.panGoal.clone(), zoom: view.zoomGoal };
    view.panGoal.set(0, 0, 0); view.zoomGoal = 1; held.clear(); view.setHover(0); view.clearLifeEvents();
    if (Sound.on) { Sound.init(); if (Sound.ctx) Sound.ctx.resume(); }
    rituals.startBreathing(); document.body.classList.add('breathing');
    document.querySelectorAll('header, .rot, .explorebar, .tools, #tray').forEach(el => { el.inert = true; });
    $('#breathingHud').hidden = false; $('#breathStop').focus(); updateRituals();
  }
  function stopBreathing(completed) {
    rituals.stopBreathing(); view.breathing = false; Sound.breathTone(0, false);
    if (view.breathCircle) view.breathCircle.visible = false;
    document.body.classList.remove('breathing'); $('#breathingHud').hidden = true;
    document.querySelectorAll('header, .rot, .explorebar, .tools, #tray').forEach(el => { el.inert = false; });
    if (breathCamera) { view.panGoal.copy(breathCamera.pan); view.zoomGoal = breathCamera.zoom; breathCamera = null; }
    $('#bMenu').focus();
    if (completed) { Sound.ritualChime(); toast('<span>Ten quiet minutes. Welcome back to your room.</span>', 3200); }
  }
  const gardenPortraits=new Map();
  const gardenUI=LRFocusGarden.createView({model:focusGarden,sheet:codeSheet,roomId:()=>meta.current,canPlant:bed=>room.get(bed)?.t==='focusgarden',
    preview:(stage,c)=>{const key=stage+':'+c;if(!gardenPortraits.has(key))gardenPortraits.set(key,view.thumb({t:'focusbloom',c,on:false},undefined,o=>{for(let n=1;n<=4;n++)o.userData.parts['growth'+n].visible=n<=stage;}));return gardenPortraits.get(key);},
    start:(bed,minutes)=>{
      updateFocusGarden(true);
      const active=focusGarden.active;if(active)return;
      const target=room.get(bed),id=target?.t==='focusgarden'?bed:null;
      const session=focusGarden.start(meta.current,id,minutes);focusGarden.settle(room,meta.current,LR);
      if(!focusGarden.active.plant)focusGarden.withoutPlant(session.id);
      changed();if(care)care.tick(0);save();Sound.tick2();todayUI.refresh();
    },
    end:()=>{updateFocusGarden(true);const ended=focusGarden.pocket();if(!ended)return;focusGarden.settle(room,meta.current,LR);changed();if(care)care.tick(0);save();todayUI.refresh();toast('<span>'+(ended.standalone?'A little pause. Your time still counts.':'Tucked back into your pocket for later')+'</span>',3200,true);companion?.say(ended.standalone?'Good stretch. Take your time.':'Good stretch. The seed will wait.');},
  });
  let gardenNext=0,gardenVisual=null;
  function updateFocusGarden(force=false){
    if(!force&&Date.now()<gardenNext)return;gardenNext=Date.now()+1000;
    focusGarden.tick();
    if(focusGarden.settle(room,meta.current,LR)){changed();save();}
    for(const s of focusGarden.state.sessions.filter(s=>s.completed&&!s.announced)){
      remember('focus',{date:LRCalendar.day(new Date(s.end)),id:s.id});
      if(s.room===meta.current&&s.plant&&room.get(s.plant))view.burst(s.plant,'petals',2.5);
      Sound.ritualChime();toast('<span>'+(s.standalone?'Focus session complete. A little time well spent.':'It burst into bloom')+'</span>',3000,true);companion?.say(s.standalone?'Good company. Good focus.':'Look at that. A whole little bloom.',true);focusGarden.ack(s.id);
    }
    if(care)care.tick(0);
    const visual=JSON.stringify([meta.current,room.items.filter(it=>CAT[it.t].focusGrowth).map(it=>[it.id,focusGarden.growth(meta.current,it.id).stage])]);if(visual!==gardenVisual){gardenVisual=visual;activity.wake();}
    gardenUI.refresh();
  }
  function updateRituals() {
    const result = rituals.tick();
    updateFocusGarden();
    if (result.breathFinished) stopBreathing(true);
    const breath = rituals.breath;
    view.breathing = breath.active; view.breathLevel = breath.level;
    if (breath.active && $('#breathCue').textContent !== breath.phase) $('#breathCue').textContent = breath.phase;
    Sound.breathTone(breath.level, breath.active && !document.hidden);
  }
  $('#breathStop').onclick = () => stopBreathing();
  document.addEventListener('visibilitychange', () => { if (document.hidden) Sound.breathTone(0, false); else updateRituals(); });
  function updateShopBalance() {
    const el = $('#shopBalance');
    if (el) el.textContent = `${shop.balance} Fireflies`;
    document.querySelectorAll('[data-shop-buy]').forEach(b => {
      const item = LRShop.allCatalog.find(c => c.id === b.dataset.shopBuy);
      b.disabled = !merchantHere() || !merchant.offers(item.id) || shop.owns(item.id) || shop.balance < item.price;
    });
    document.querySelectorAll('[data-shop-tip]').forEach(b=>b.disabled=!merchantHere()||shop.balance<Number(b.dataset.shopTip));
    const gild=$('#shopGild');if(gild)gild.disabled=!merchantHere()||LRShop.isGilded(room)||shop.balance<150;
  }
  function openShop(stall, purchased) {
    const body = $('#sheetBody');
    const here = merchantHere();
    body.dataset.merchant = here ? 'here' : 'away'; body.dataset.tool = 'merchant';
    body.innerHTML = `<div class="grab"></div><div class="rowbtns"><button class="chipbtn" id="shopBack">Menu</button><button class="chipbtn sheet-icon" id="shopClose" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
      <h2>Mallow’s traveling treasures</h2><p id="shopBalance" role="status" aria-live="polite"></p>
      <p class="muted">${here ? 'Three little finds in a well-traveled satchel. Anything you take home is yours forever.' : 'Mallow is out wandering. He drops by cozy rooms from time to time. Missed him? He’ll come back another day. Your Fireflies and treasures are safe.'}</p>
      <p class="muted small">${here ? 'Nothing is gone forever. There’s always another visit. ' : ''}Fireflies come from cozy play. No money purchases, no ads.</p>
      <div class="shop-grid"></div>`;
    $('#shopBack').onclick = () => { body.dataset.merchant = ''; renderMenu(); };
    $('#shopClose').onclick = closeSheets;
    const grid = body.querySelector('.shop-grid');
    LRShop.allCatalog.filter(item => here && merchant.offers(item.id)).forEach(item => {
      const owned = shop.owns(item.id), card = document.createElement('div');
      card.className = 'shop-card' + (purchased === item.id ? ' purchased' : '');
      card.dataset.shopItem = item.id;
      card.innerHTML = `${item.costume ? `<img alt="" src="${costumeThumb(item.costume)}">` : item.piece ? `<img alt="" src="${thumbOf(item.piece)}">` : `<div class="shop-icon" aria-hidden="true">${item.icon}</div>`}
        <b>${item.name}</b>${item.exclusive ? '<small class="shop-exclusive">Traveling colorway</small>' : ''}<p>${item.desc}</p><span>${item.price} Fireflies</span>
        <button class="chipbtn ${owned ? '' : 'primary'}" data-shop-buy="${item.id}" aria-label="${owned ? 'Owned: ' : 'Buy '}${item.name}${owned ? '' : ' for ' + item.price + ' Fireflies'}">${owned ? '✓ Owned' : 'Buy'}</button>`;
      card.querySelector('button').onclick = () => {
        if (!merchantHere() || !merchant.offers(item.id)) { openShop(); return; }
        if (!shop.buy(item.id)) return;
        const anchor = merchantCat || room.get(stall) || room.items[0];
        if (anchor) { view.burst(anchor.id, 'magic', 1.4); view.sparkle(view.itemPoint(anchor.id, [4, 10, 4]), 0xffe39a, 24); }
        Sound.arpeggio(); renderTray(); openShop(stall, item.id);
      };
      grid.appendChild(card);
    });
    if(here) {
      const sinks=document.createElement('section');sinks.className='shop-sinks';sinks.setAttribute('aria-label','A little extra warmth');
      const tips=document.createElement('div');tips.className='shop-tip';
      const title=document.createElement('h3');title.textContent='Mallow’s tip jar';
      const note=document.createElement('p');note.className='muted small';note.textContent='A little kindness for the road. No item, just a happy cat.';tips.append(title,note);
      const actions=document.createElement('div');actions.className='rowbtns';
      const thanks=document.createElement('p');thanks.className='shop-thanks';thanks.setAttribute('role','status');
      for(const n of [5,10,25]){const b=document.createElement('button');b.type='button';b.className='chipbtn';b.textContent=`Tip ${n} ✦`;b.dataset.shopTip=n;b.setAttribute('aria-label',`Tip Mallow ${n} Fireflies`);b.disabled=shop.balance<n;
        b.onclick=()=>{if(!merchantHere()||!shop.tip(n))return;view.petCat(merchantCat.id);view.boing(merchantCat.id);view.spin(merchantCat.id);Sound.chime();updateShopBalance();sinks.querySelectorAll('[data-shop-tip]').forEach(btn=>btn.disabled=shop.balance<Number(btn.dataset.shopTip));gild.disabled=LRShop.isGilded(room)||shop.balance<150;thanks.textContent='Mallow pocketed your tip and did a little spin.';};actions.appendChild(b);}
      tips.append(actions,thanks);
      const finish=document.createElement('div');finish.className='shop-finish';const heading=document.createElement('h3');heading.textContent='Gild this room';const desc=document.createElement('p');desc.className='muted small';desc.textContent='A warm golden-hour glow, just for this room. Repainting walls or floors lets it go.';
      const gild=document.createElement('button');gild.type='button';gild.className='chipbtn primary';gild.id='shopGild';gild.textContent=LRShop.isGilded(room)?'This room is gilded':'Gild this room · 150 ✦';gild.disabled=LRShop.isGilded(room)||shop.balance<150;
      gild.onclick=()=>{if(!merchantHere()||!shop.gild(room))return;changed();save();Sound.arpeggio();toast('<span>A little golden hour, kept here.</span>',1800);openShop(stall);};finish.append(heading,desc,gild);sinks.append(tips,finish);grid.after(sinks);
    }
    updateShopBalance();
    openSheet();
  }
  function wardrobeSheet() {
    wardrobe.sync();
    codeSheet('A little wardrobe', 'Outfits stay on this device. Your roommate and wardrobe choices never travel in shared room codes.', h => {
      const names = {hood:'Hats',suit:'Tops',badge:'Badges',accessory:'Accessories'};
      const head = h('div','wardrobe-head'), shopButton = document.createElement('button');
      shopButton.className='chipbtn';shopButton.textContent='✦ Shop';shopButton.onclick=()=>openShop();head.append(shopButton,$('#sheetBody > .sheet-close'));$('#sheetBody').insertBefore(head,$('#sheetBody > h2'));
      const stage=h('div','wardrobe-stage'), preview=document.createElement('img');
      preview.alt='Your little roommate, wearing your current picks';preview.className='wardrobe-preview';stage.appendChild(preview);
      const tabs=h('div','wardrobe-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Clothing categories');
      const grid=h('div','wardrobe-grid');grid.id='wardrobeItems';grid.setAttribute('role','tabpanel');
      const buttons=[];let active='all';
      function refresh() {
        preview.src=view.thumb({t:'wardrobe-preview:'+JSON.stringify(wardrobe.slots),c:0,on:true},LRCompanion.definitionForSlots(wardrobe.slots,true),o=>{o.userData.parts.lids.visible=false;},360);
        for(const tab of buttons){const on=tab.dataset.slot===active;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;}
        grid.setAttribute('aria-labelledby','wardrobeTab-'+active);grid.replaceChildren();
        for(const slot of LRCostumes.SLOTS.filter(s=>active==='all'||active===s)) {
          for(const c of LRCostumes.COSTUMES.filter(c=>c.id==='plain'||c.layers[slot])) {
            const owned=wardrobe.owns(c.id), pick=wardrobe.slots[slot];
            const equipped=c.id==='plain'?!LRCostumes.find(pick)?.layers[slot]:pick===c.id, card=document.createElement('button');
            card.type='button';card.className='wardrobe-card'+(equipped?' equipped':'');card.dataset.costume=c.id;card.dataset.slot=slot;
            card.disabled=!owned;card.setAttribute('aria-pressed',String(equipped));
            const title=c.id==='plain'?'Bare':c.name;
            card.setAttribute('aria-label',names[slot]+': '+title+(owned?'':', '+LRCostumes.condition(c)));
            const img=document.createElement('img');img.alt='';
            const picks=LRCostumes.slotsFor('plain');picks[slot]=c.id;
            img.src=slotThumb(picks);card.appendChild(img);
            const label=document.createElement('b');label.textContent=title;card.appendChild(label);
            const note=document.createElement('small');note.textContent=owned?names[slot]:LRCostumes.condition(c);card.appendChild(note);
            if(equipped){const check=document.createElement('span');check.className='wardrobe-check';check.textContent='✓';check.setAttribute('aria-hidden','true');card.appendChild(check);}
            card.onclick=()=>{
              const next=wardrobe.slots[slot]===c.id?'plain':c.id;
              if(!wardrobe.equipSlot(slot,next))return;
              companion.setSlots(wardrobe.slots);companion.frame(0);activity.wake();Sound.chime();refresh();
              grid.querySelector(`[data-slot="${slot}"][data-costume="${c.id}"]`)?.focus({preventScroll:true});
            };
            grid.appendChild(card);
          }
        }
      }
      for(const [slot,label] of [['all','All'],...Object.entries(names)]) {
        const tab=document.createElement('button');tab.className='chipbtn';tab.textContent=label;tab.dataset.slot=slot;tab.id='wardrobeTab-'+slot;
        tab.setAttribute('role','tab');tab.setAttribute('aria-controls',grid.id);tab.onclick=()=>{active=slot;refresh();};
        buttons.push(tab);tabs.appendChild(tab);
      }
      refresh();
    });
  }
  const slotThumbs=new Map();
  function slotThumb(slots) {
    const key=JSON.stringify(slots);
    if(!slotThumbs.has(key))slotThumbs.set(key,view.thumb({t:'slot-preview:'+key,c:0,on:true},LRCompanion.definitionForSlots(slots,true),o=>{o.userData.parts.lids.visible=false;}));
    return slotThumbs.get(key);
  }
  const costumeThumbs = new Map();
  function costumeThumb(id) {
    if (!costumeThumbs.has(id)) costumeThumbs.set(id, view.thumb({t:'companion-preview:' + id,c:0,on:true}, LRCompanion.definitionFor(id,true), obj => { obj.userData.parts.lids.visible = false; }));
    return costumeThumbs.get(id);
  }
  function dressCat(cat) {
    if (!shop.owns('crown') || cat.visitor || cat.t !== 'cat') return;
    pushUndo(); cat.crown = !cat.crown; changed();
    view.sparkle(view.itemPoint(cat.id, [4, 10, 6]), 0xffd778, 12); Sound.chime();
    toast(`<span>${nameOf(cat)} ${cat.crown ? 'wears the crown' : 'takes a crown break'}</span>`, 1500);
  }
  function crownSheet() {
    if (!shop.owns('crown')) { openShop(); return; }
    const body = $('#sheetBody');
    body.dataset.merchant = '';
    delete body.dataset.tool; body.innerHTML = '<div class="grab"></div><h2>A crown for a cozy cat</h2><p class="muted">Tap a cat’s name to put on or take off their crown. Save the room to keep their outfit.</p><div class="rowbtns" id="crownCats"></div><button class="chipbtn" id="crownClose">Done</button>';
    const cats = room.items.filter(i => i.t === 'cat' && !i.visitor);
    cats.forEach(cat => {
      const b = document.createElement('button'); b.className = 'chipbtn';
      b.textContent = `${cat.crown ? '👑 ' : ''}${nameOf(cat)}`;
      b.setAttribute('aria-pressed', String(!!cat.crown));
      b.onclick = () => { dressCat(cat); crownSheet(); };
      $('#crownCats').appendChild(b);
    });
    if (!cats.length) $('#crownCats').textContent = 'Add a cat from the Pets tab first.';
    $('#crownClose').onclick = closeSheets; openSheet();
  }
  // TwoStoryTails captions: a pixel studio sheet, from Control Center or the clapperboard.
  function captionStudio() {
    codeSheet('Caption studio', 'TwoStoryTails clips, ready to copy.', h => { const host = h('section', 'caption-studio'); host.setAttribute('aria-label', 'Caption studio'); LRCaptions.render(host, captionDesk); }, 'captions');
    captionDesk.refresh();
  }
  // Cozy moments: a floating card under the room name, with the checklist and the cats' diary.
  const cozyPop = document.createElement('section');
  cozyPop.id = 'cozyMoments'; cozyPop.className = 'cozy-pop panel'; cozyPop.hidden = true;
  cozyPop.setAttribute('role', 'dialog'); cozyPop.setAttribute('aria-labelledby', 'cozyMomentsTitle');
  cozyPop.innerHTML = `<div class="cozy-pop-head app-sheet-heading" data-control-header="true"><h2 id="cozyMomentsTitle">Cozy moments</h2><span class="cozy-pop-count"></span><button type="button" class="chipbtn sheet-icon cozy-pop-close" aria-label="Close cozy moments"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
    <div class="cozy-pop-tabs" role="group" aria-label="Journal feeds"><button type="button" class="chipbtn" id="bMomentDiary">Checklist</button><button type="button" class="chipbtn" id="bCatDiary">The cats’ version</button></div>
    <div class="disc cozy-pop-feed" id="journalFeed"></div>`;
  document.body.appendChild(cozyPop);
  cozyPop.querySelector('#bMomentDiary').onclick = () => { journalFeed = 'moments'; renderJournal(); };
  cozyPop.querySelector('#bCatDiary').onclick = () => { journalFeed = 'cats'; renderJournal(); };
  const cozyOpen = () => !cozyPop.hidden;
  function openCozyMoments(feed) {
    if (feed) journalFeed = feed;
    cozyPop.hidden = false; $('#disc').setAttribute('aria-expanded', 'true'); renderJournal();
    try { Sound.slide(true); } catch (e) { /* optional interface sound */ }
    cozyPop.querySelector(journalFeed === 'cats' ? '#bCatDiary' : '#bMomentDiary').focus({ preventScroll: true });
  }
  function closeCozyMoments(focus = true) {
    if (!cozyOpen()) return;
    cozyPop.hidden = true; $('#disc').setAttribute('aria-expanded', 'false');
    if (focus && (cozyPop.contains(document.activeElement) || document.activeElement === document.body)) $('#disc').focus({ preventScroll: true });
  }
  cozyPop.querySelector('.cozy-pop-close').onclick = () => closeCozyMoments();
  document.addEventListener('pointerdown', e => { if (cozyOpen() && !cozyPop.contains(e.target) && !e.target.closest?.('#disc')) closeCozyMoments(false); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cozyOpen()) { e.preventDefault(); e.stopImmediatePropagation(); closeCozyMoments(); } }, true);
  $('#disc').onclick = () => cozyOpen() ? closeCozyMoments() : openCozyMoments();
  function renderJournal() {
    const feed = $('#journalFeed'); if (!feed || cozyPop.hidden) return;
    feed.innerHTML = '';
    cozyPop.querySelector('.cozy-pop-count').textContent = `${found.size} of ${MOMENTS.length} found`;
    if(journalFeed==='moments')todayUI.mountMoment(feed);
    const archive = document.createElement('h3'); archive.className = 'journal-archive-title'; archive.textContent = journalFeed === 'cats' ? 'The cats’ archive' : 'Cozy moments checklist'; feed.appendChild(archive);
    ['moments', 'cats'].forEach(k => {
      const b = $(k === 'cats' ? '#bCatDiary' : '#bMomentDiary');
      if (b) { b.classList.toggle('primary', journalFeed === k); b.setAttribute('aria-pressed', String(journalFeed === k)); }
    });
    if (journalFeed === 'cats') {
      feed.id = 'journalFeed';
      const list = document.createElement('div'); list.id = 'catDiary'; feed.appendChild(list);
      if (!catJournal.entries.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'The cats haven’t put paw to paper yet. A nap, a cuddle, a small crime against a mug… they’ll have opinions.'; list.appendChild(p); }
      catJournal.entries.forEach(entry => {
        const el = document.createElement('div'); el.className = 'd got';
        const when = new Date(entry.time), time = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        el.innerHTML = `<i>🐾</i><div><b>${esc(entry.name || (CATS[entry.coat] || CATS[0]).name)} <small>${esc(when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</small></b><span>${esc(time)}: ${esc(entry.text)}</span></div>`;
        list.appendChild(el);
      });
    } else MOMENTS.forEach(([k, name, desc]) => {
      const got = found.has(k), el = document.createElement('div'); el.className = 'd' + (got ? ' got' : '');
      el.innerHTML = `<i>${got ? '✦' : '?'}</i><div><b>${got ? name : '???'}</b><span>${got ? desc : 'Keep exploring…'}</span></div>`; feed.appendChild(el);
    });
  }
  $('#bMenu').onclick = () => {
    if (sheet.classList.contains('open') && $('#menu-today')) { closeSheets(); return; }
    renderMenu(); openSheet();
    try { Sound.slide(true); } catch (e) { /* optional interface sound */ }
  };
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheets(); });
  $('#brand').onclick = () => {
    const name = prompt('Name this room', room.name);
    if (name && name.trim()) { room.name = name.trim().slice(0, 40); updateHeader(); dirty = true; }
  };

  // Templates grouped into native disclosures. New-room lists start collapsed;
  // first-run onboarding keeps both groups open for exploration.
  function presetCards(onPick, collapsed = false) {
    const wrap = document.createElement('div'); wrap.className = 'preset-groups';
    let grid;
    const head = text => {
      const group=document.createElement('details');group.className='preset-group';group.open=!collapsed;
      const summary=document.createElement('summary');summary.textContent=text;
      grid=document.createElement('div');grid.className='cards';group.append(summary,grid);wrap.appendChild(group);
    };
    const card = (k, p) => {
      const b = document.createElement('button'); b.className = 'card ' + k;
      b.innerHTML = `<div class="art">${p.scene ? '<em class="tag">Scene</em>' : ''}</div><b>${p.name}</b><span>${p.blurb}</span>`;
      if (p.art) b.querySelector('.art').style.background = p.art;   // packs give their own card colours
      b.onclick = () => onPick(k);
      grid.appendChild(b);
    };
    const all = Object.entries(PRESETS);
    head('Rooms');
    const rb = document.createElement('button'); rb.className = 'card random';
    rb.innerHTML = `<div class="art">🎲</div><b>Surprise me</b><span>A brand-new random room every time.</span>`;
    rb.onclick = () => onPick('random');
    grid.appendChild(rb);
    all.filter(([, p]) => !p.scene).forEach(([k, p]) => card(k, p));
    head('Scenes');
    all.filter(([, p]) => p.scene).forEach(([k, p]) => card(k, p));
    return wrap;
  }
  function fillRoom(k) {
    if (k === 'random') { room.n = LR.N; room.generate((Math.random() * 0xffffffff) >>> 0); }
    else { PRESETS[k].make(room); room.name = PRESETS[k].name; }
  }
  function newRoom(k, forcedId) {
    const id = forcedId || Date.now();
    fillRoom(k);
    meta.current = id; delete meta.visit; undo.length = 0; baseSig = sig();
    view.panGoal.set(0, 0, 0); view.zoomGoal = 1;
    if (forcedId) commit(true);   // a room built through a door joins the house straight away
    changed(); save(); saveMeta(); updateHeader();
    toast(`<b>${room.name}</b><span>${forcedId ? 'A fresh room through the door' : 'A fresh room to play with. Tap Save to keep it.'}</span>`, 2400);
    Sound.stamp(); setTimeout(() => Sound.arpeggio(), 250);
  }
  // share codes: a room squeezed into a short text a friend can paste in
  const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function squeeze(bytes, how) {
    const stream = new Blob([bytes]).stream().pipeThrough(how === 'in' ? new CompressionStream('deflate-raw') : new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function roomCode(source = room.serialize()) {
    const d = LRWidgets.shareDecor(source);
    if (arguments.length === 0 && isSaved()) d.gid = meta.current;                            // so a guest's note finds its way back to this room
    d.items = d.items.map(i => { const o = Object.assign({}, i); if (!o.c) delete o.c; if (!o.r) delete o.r; if (!o.on) delete o.on; return o; });   // drop the defaults
    const raw = new TextEncoder().encode(JSON.stringify(d));
    if (typeof CompressionStream === 'undefined') return 'LR0.' + b64u(raw);
    return 'LR1.' + b64u(await squeeze(raw, 'in'));
  }
  async function readCode(code) {
    const m = String(code).trim().match(/^LR([01])\.([A-Za-z0-9_-]+)$/);
    if (!m) throw new Error('not a room code');
    const bytes = unb64u(m[2]);
    const d = JSON.parse(new TextDecoder().decode(m[1] === '1' ? await squeeze(bytes, 'out') : bytes));
    d.items.forEach(i => { ['c', 'r'].forEach(k => { if (i[k] == null) i[k] = 0; }); if (i.on == null) i.on = false; });
    return d;
  }
  function alignSheetHeader(body){
    if(body.querySelector('[data-control-header],#homeView'))return;
    const close=body.querySelector('.french-close,.sheet-close,#shopClose,#crownClose');
    const title=body.querySelector(':scope > h2,.tea-heading,.french-chrome h2');
    if(!close||!title)return;
    // French keeps its reusable title and progress within its own view.
    const french=title.closest('.french-chrome');
    if(french){french.classList.add('app-sheet-heading');french.dataset.controlHeader='true';return;}
    const header=document.createElement('div');header.className='app-sheet-heading';header.dataset.controlHeader='true';
    const grab=body.querySelector(':scope > .grab');if(grab)grab.after(header);else body.prepend(header);
    const history=body.querySelector('.mood-history');
    if(history){header.classList.add('mood-heading');header.append(title,history,close);}else header.append(title,close);
  }
  // tool tags the sheet so the shared pastel tool styles (tools.css) can theme it.
  const SHEET_TOOLS = { 'Caption studio':'captions', 'On the fridge door':'groceries', 'Pushup tally':'tally', 'The idea jar':'ideas', 'Tea':'tea', 'A little savings jar':'savings', 'Pixel maker':'sketch', 'French corner':'french', 'A little whiteboard':'whiteboard', 'A little wardrobe':'wardrobe', 'Files':'files', 'Rename file':'files', 'Delete this file?':'files', 'Calendar':'calendar', 'The newspaper':'newspaper', 'Book':'book' };
  const SHEET_TOOL_SUBS = { 'TwoStoryTails posting plan':'tst', 'Your day, remembered gently.':'calendar' };
  function codeSheet(title, sub, build, tool = '') {
    frenchUI?.close(false);
    letters.close(false);
    releaseRoomQR();
    home.close(false);
    roomToolsUI.close();
    if (!tool) tool = SHEET_TOOLS[title] || SHEET_TOOL_SUBS[sub] || '';
    const body = $('#sheetBody'); delete body.dataset.dashboardFont; if (tool) body.dataset.tool = tool; else delete body.dataset.tool; body.innerHTML = '';
    const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; body.appendChild(el); return el; };
    h('div', 'grab');
    const close = h('button', 'chipbtn sheet-close sheet-icon', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'); close.type = 'button'; close.setAttribute('aria-label', 'Close dialog'); close.onclick = closeSheets;
    h('h2', '', title); h('p', 'muted', sub);
    build(h); alignSheetHeader(body);openSheet();
  }
  function widgetLinks(panel, links, id) {
    links.forEach(row => {
      const a = document.createElement('a'); a.textContent = row.label;
      a.href = row.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.onclick = () => { if (widgetView) widgetView.feedback(id); };
      panel.appendChild(a);
    });
  }
  function widgetAction(it) {
    const def = LRWidgets.attached(it.t);
    if (!def || !['tst-corkboard', 'pomodoro-candle', 'app-portals'].includes(def.id)) return false;
    widgets.refresh([it.t]);
    const data = widgets.data(def.id), links = widgets.destinations(it.t);
    if (def.id === 'tst-corkboard') {
      codeSheet(data.title, 'TwoStoryTails posting plan', h => {
        h('p').textContent = `Posting cadence: ${data.cadence}`;
        h('p').textContent = `Content pillars: ${data.pillars.join(' · ')}`;
        h('p').textContent = `Next post: ${data.nextPost}`;
        widgetLinks(h('div', 'widget-news'), links, it.id);
      });
    } else if (links.length > 1) {
      codeSheet('Choose a destination', CAT[it.t].name, h => widgetLinks(h('div', 'widget-news'), links, it.id));
    } else if (links.length) {
      // Start the visual feedback before opening, keeping navigation in the tap
      // gesture so mobile browsers can open a tab without a blocked async popup.
      if (widgetView) widgetView.feedback(it.id);
      if (def.id === 'pomodoro-candle') Sound.matchStrike();
      window.open(links[0].url, '_blank', 'noopener,noreferrer');
    } else toast('<span>That doorway is quiet for now.</span>', 1600);
    return true;
  }
  function newspaperSheet() {
    codeSheet('The newspaper', 'CBC News · Top stories', h => {
      const panel = h('div', 'widget-news');
      function render() {
        const data = widgets.data('newspaper'); panel.replaceChildren();
        const note = document.createElement('p'); note.className = 'muted';
        note.textContent = data.cached ? 'cached · Last good headlines' : data.headlines.length ? 'Your quiet catch-up.' : 'No headlines cached yet. CBC will be checked again later.';
        panel.appendChild(note);
        data.headlines.forEach(row => {
          const link = document.createElement('a'); link.href = row.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
          const title = document.createElement('b'), source = document.createElement('span');
          title.textContent = row.title; source.textContent = row.source; link.append(title, source); panel.appendChild(link);
        });
      }
      render(); widgets.refresh(['newspaper']).then(() => { if (panel.isConnected) render(); });
    });
  }
  async function shareSheet() {
    const code = await roomCode();
    codeSheet(`Share “${room.name}”`, 'Send this code to a friend. They tap “Open a friend’s code” in their menu and paste it.', h => {
      const ta = h('textarea', 'code'); ta.readOnly = true; ta.value = code; ta.rows = 4;
      h('p', 'muted small', `${code.length} characters`);
      const row = h('div', 'rowbtns');
      row.innerHTML = '<button class="chipbtn" id="bCopyCode">Copy</button>' + (cap && cap.isNativePlatform && cap.isNativePlatform() || navigator.share ? '<button class="chipbtn" id="bSendCode">Send…</button>' : '');
      row.querySelector('#bCopyCode').onclick = async () => { try { await navigator.clipboard.writeText(code); } catch (e) { ta.select(); document.execCommand('copy'); } toast('<span>Code copied</span>', 1200); Sound.chime(); };
      const send = row.querySelector('#bSendCode');
      if (send) send.onclick = async () => {
        try {
          if (cap && cap.isNativePlatform && cap.isNativePlatform()) await cap.registerPlugin('Share').share({ title: 'My Lofi Room', text: `Come see my Lofi Room! Paste this code in the app: ${code}` });
          else await navigator.share({ title: 'My Lofi Room', text: code });
        } catch (e) { /* cancelled */ }
      };
      ta.onclick = () => ta.select();
      shareQR=LRRoomQR.createView({host:$('#sheetBody'),code,renderer:view,phase:meta.phase,notice:text=>toast(`<span>${esc(text)}</span>`,2400,true)});
    });
  }
  const friendCards=LRFriendCards.create({store});
  async function prepareFriendCard(code) {
    const d=await readCode(code),probe=new LR.Room();
    if(!probe.load(d))throw Error('bad room');
    const decor=LRWidgets.shareDecor(probe.serialize());
    const gid=typeof d.gid==='number'&&Number.isFinite(d.gid)?d.gid:null;
    return {room:decor,gid,title:probe.name,description:LRRoomViews.description(decor),n:probe.n,items:probe.items.length,identity:gid?'room:'+gid:JSON.stringify(decor)};
  }
  function visitFriendCard(data) {
    closeSheets();
    leaveThen(()=>{
      let id=Date.now();while(id===meta.current||rooms.some(r=>r.id===id))id++;
      room.load(data.room);meta.current=id;undo.length=0;baseSig=sig();
      meta.visit={id,gid:data.gid,host:room.name};
      view.panGoal.set(0,0,0);view.zoomGoal=1;changed();save();saveMeta();updateHeader();
      toast(`<b>${esc(room.name)}</b><span>Visiting a friend’s room. Sign their guest book, or tap Save to keep it.</span>`,3000);Sound.stamp();setTimeout(()=>Sound.arpeggio(),250);
    });
  }
  const friendCardsUI=LRFriendCards.createView({model:friendCards,sheet:codeSheet,prepare:prepareFriendCard,visit:visitFriendCard,thumb:decor=>view.roomThumb(decor),sound:Sound,reduced:()=>view.reducedMotion,
    notice:text=>{Sound.nope();toast(`<span>${esc(text)}</span>`,2200,true);},
    receiveNote:async code=>{await receiveNote(code);closeSheets();},
    scan:({host,onCode})=>{roomScanner=LRRoomQR.scanner({host,onCode,notice:text=>toast(`<span>${esc(text)}</span>`,2400,true)});return ()=>roomScanner?.start();}});
  function importSheet() { friendCardsUI.open(); }
  // the guest book: a friend visiting your shared room signs it and gets a reply code; when you paste it,
  // their note is pinned in that room. No server: the codes carry everything.
  const STICKER_GLYPHS = ['♥', '★', '🐾', '✿', '☕', '♪', '☾', '✦'];
  async function noteCode(n) {
    const raw = new TextEncoder().encode(JSON.stringify(n));
    if (typeof CompressionStream === 'undefined') return 'LRG0.' + b64u(raw);
    return 'LRG1.' + b64u(await squeeze(raw, 'in'));
  }
  async function readNote(code) {
    const m = String(code).trim().match(/^LRG([01])\.([A-Za-z0-9_-]+)$/);
    if (!m) throw new Error('not a note code');
    const bytes = unb64u(m[2]);
    const n = JSON.parse(new TextDecoder().decode(m[1] === '1' ? await squeeze(bytes, 'out') : bytes));
    return { g: n.g || null, r: String(n.r || '').slice(0, 40), n: String(n.n || 'A friend').slice(0, 20), t: String(n.t || '').slice(0, 80), s: Math.max(0, Math.min(7, n.s | 0)), d: /^\d{4}-\d\d-\d\d$/.test(n.d) ? n.d : today() };
  }
  function signSheet() {
    const v = meta.visit || {};
    let pick = 0;
    codeSheet('Sign the guest book', `Leave a little note in “${esc(v.host || room.name)}”. You’ll get a reply code to send back to your friend.`, h => {
      const row = h('div', 'stickers');
      STICKER_GLYPHS.forEach((g, i) => { const b = document.createElement('button'); b.className = 'stk' + (i === 0 ? ' on' : ''); b.textContent = g; b.setAttribute('aria-label', 'Sticker ' + (i + 1)); b.onclick = () => { pick = i; row.querySelectorAll('.stk').forEach((x, j) => x.classList.toggle('on', j === i)); Sound.blip(); }; row.appendChild(b); });
      const nm = h('input', 'gbname'); nm.placeholder = 'Your name'; nm.maxLength = 20; nm.value = store.get('lr.guestName', '');
      const tx = h('textarea', 'code gbnote'); tx.placeholder = 'A tiny note (optional)'; tx.maxLength = 80; tx.rows = 2;
      const go = h('div', 'rowbtns'); go.innerHTML = '<button class="chipbtn primary" id="gbSign">Sign &amp; get reply code</button>';
      go.querySelector('#gbSign').onclick = async () => {
        const name = nm.value.trim().slice(0, 20) || 'A friend'; store.set('lr.guestName', name);
        const code = await noteCode({ g: v.gid || null, r: v.host || room.name, n: name, t: tx.value.trim().slice(0, 80), s: pick, d: today() });
        Sound.chime(); discover('signed');
        codeSheet('Signed! ' + STICKER_GLYPHS[pick], 'Send this code back to your friend. They paste it in “Open a friend’s code” and your note appears in their room.', h2 => {
          const ta = h2('textarea', 'code'); ta.readOnly = true; ta.value = code; ta.rows = 3; ta.onclick = () => ta.select();
          const r2 = h2('div', 'rowbtns');
          r2.innerHTML = '<button class="chipbtn" id="gbCopy">Copy</button>' + (cap && cap.isNativePlatform && cap.isNativePlatform() || navigator.share ? '<button class="chipbtn" id="gbSend">Send…</button>' : '');
          r2.querySelector('#gbCopy').onclick = async () => { try { await navigator.clipboard.writeText(code); } catch (e) { ta.select(); document.execCommand('copy'); } toast('<span>Note code copied</span>', 1200); Sound.chime(); };
          const send = r2.querySelector('#gbSend');
          if (send) send.onclick = async () => {
            try {
              if (cap && cap.isNativePlatform && cap.isNativePlatform()) await cap.registerPlugin('Share').share({ title: 'I signed your guest book', text: `I left you a note in Lofi Rooms! Paste this in “Open a friend’s code”: ${code}` });
              else await navigator.share({ title: 'I signed your guest book', text: code });
            } catch (e) { /* cancelled */ }
          };
        });
      };
    });
  }
  // pin a note on a free spot of a wall (live room, or a saved room's stored copy)
  function pinNote(R, n) {
    for (const e of [4, 3, 5, 2, 1]) for (const k of [0, 1]) for (let u = 0; u < R.n; u++) {   // eye level and up first, above the furniture
      const it = R.make('guestnote', { k, u, e, c: n.s, note: { n: n.n, t: n.t, d: n.d } });
      if (R.canPlace(it)) return R.add(it);
    }
    return null;
  }
  async function receiveNote(code) {
    const n = await readNote(code);
    const book = store.get('lr.guestbook', []);
    if (book.some(b => b.n === n.n && b.t === n.t && b.d === n.d && b.g === n.g && b.s === n.s)) { toast('<span>That note is already in your guest book</span>', 1600); return; }
    const target = n.g && rooms.some(r => r.id === n.g) ? n.g : meta.current;
    let placed = false;
    if (target === meta.current) {
      const clean = !isEdited();
      placed = !!pinNote(room, n); changed();
      if (placed && isSaved()) { patchSaved(meta.current, d => { const it = room.items[room.items.length - 1]; d.items.push(Object.assign({}, it)); d.next = Math.max(d.next || 0, room.next); }); if (clean) baseSig = sig(); }
      save(); updateHeader();
    } else {
      const d = store.get('lr.room.' + target, null), R = new LR.Room();
      if (d && R.load(d)) { placed = !!pinNote(R, n); if (placed) { try { put('lr.room.' + target, JSON.stringify(R.serialize())); } catch (e) { /* quota */ } } }
    }
    book.unshift(Object.assign({ room: target }, n)); store.set('lr.guestbook', book.slice(0, 100));
    const where = target === meta.current ? '' : ` in ${esc(roomTitle(target))}`;
    toast(`<b>${STICKER_GLYPHS[n.s]} A note from ${esc(n.n)}</b><span>${n.t ? `“${esc(n.t)}”` : 'They left you a sticker'}${placed ? ` · pinned on the wall${where}` : ' · saved in your guest book'}</span>`, 4200, true);
    Sound.chime(); setTimeout(() => Sound.arpeggio(), 300); discover('guestbook');
  }
  $('#bGuest').onclick = () => { Sound.init(); signSheet(); };

  // linked rooms: a door opens onto another saved room, and the rooms become a tiny apartment
  const isPortal = it => CAT[it.t] && CAT[it.t].tap === 'portal';
  const roomTitle = id => { const r = rooms.find(x => x.id === id); return r ? r.name : 'another room'; };
  // the cell you stand in to go through a door, and the way you face to walk into it
  function doorFront(it, k) {
    const n = room.n, u = it.u + (k || 0);   // k: which cell along a wide door
    if (CAT[it.t].kind === 'wall') return [[u, 0, Math.PI], [0, n - 1 - u, -Math.PI / 2], [n - 1 - u, n - 1, 0], [n - 1, u, Math.PI / 2]][it.k];
    const d = [[0, 1], [1, 0], [0, -1], [-1, 0]][(it.r || 0) & 3];   // a doorway faces +z, turned by r
    return [it.x + d[0], it.z + d[1], Math.atan2(-d[0], -d[1])];
  }
  // make sure the room we just walked into has a door leading back
  function backDoor(from, hint) {
    let back = room.items.find(i => isPortal(i) && i.link === from) || room.items.find(i => isPortal(i) && !i.link);
    const open = WALLS[room.wall.style] && WALLS[room.wall.style].none;
    const tryAdd = d => (room.canPlace(d) ? room.add(d) : null);
    if (!back && !open) {
      const t = hint && hint.t && CAT[hint.t] && CAT[hint.t].kind === 'wall' ? hint.t : 'roomdoor', c = hint && hint.t === t ? hint.c || 0 : 0;   // same style as the door you came through
      if (hint && hint.k != null) back = tryAdd(room.make(t, { k: hint.k, u: Math.min(hint.u, room.n - CAT[t].size[0]), e: 0, c, link: from }));
      for (let k = 0; !back && k < 2; k++) for (let u = 1; !back && u < room.n - CAT[t].size[0]; u++) back = tryAdd(room.make(t, { k, u, e: 0, c, link: from }));
      for (let k = 0; !back && k < 2; k++) for (let u = 1; !back && u < room.n - 1; u++) back = tryAdd(room.make('roomdoor', { k, u, e: 0, link: from }));
    }
    if (!back) for (let x = 1; !back && x < room.n - 1; x++) for (let z = 0; !back && z < room.n - 2; z++) { const g = room.make('roomgate', { x, z, link: from }); if (view.cellFree(x, z + 1) || !view.walk) back = tryAdd(g); }
    if (back && !back.link) back.link = from;
    return back;
  }
  let travelling = false;
  function walkThrough(door, to, asCat, asked) {
    if (travelling) return;
    if (!asked && isEdited()) { leaveThen(() => walkThrough(door, to, asCat, true)); return; }
    travelling = true;
    const from = meta.current, hint = CAT[door.t].kind === 'wall' ? { k: door.k, u: door.u, t: door.t, c: door.c } : null;
    view.openDoor(door.id); Sound.creak();
    toast(`<span>Into ${roomTitle(to)}…</span>`, 900, true);
    setTimeout(() => $('#fade').classList.add('on'), 420);
    setTimeout(() => {
      switchRoom(to, true);
      const back = backDoor(from, hint);
      changed();
      if (back && isSaved()) { const keep = { ...back }; patchSaved(meta.current, d => { if (!d.items.some(i => i.id === keep.id)) d.items.push(keep); else d.items.forEach(i => { if (i.id === keep.id) i.link = keep.link; }); d.next = Math.max(d.next || 0, room.next); }); baseSig = sig(); }
      save();
      $('#fade').classList.remove('on');
      if (back) setTimeout(() => view.openDoor(back.id), 200);
      discover('openhouse');
      // walking as a cat: arrive as that cat in the doorway on the other side
      if (asCat != null && back) {
        const [fx, fz, face] = doorFront(back);
        const cat = room.add(room.make('cat', { x: Math.max(0, Math.min(room.n - 1, fx)), z: Math.max(0, Math.min(room.n - 1, fz)), c: asCat.c, name: asCat.name, visitor: true, explorer: true }));
        changed();
        setTimeout(() => { const P = view.pets.get(cat.id); if (P) P.heading = face + Math.PI; enterCat(cat.id); discover('wanderer'); travelling = false; }, 60);
      } else travelling = false;
    }, 820);
  }
  // in cat view, walking into a door's doorway takes you through it
  let doorNear = 0, doorCool = 0;
  function catDoors(now) {
    if (!view.fp || travelling || now < doorCool) return;
    const P = view.pets.get(view.fp.id), me = room.get(view.fp.id);
    if (!P || !me) return;
    const cx = Math.floor(P.x), cz = Math.floor(P.z);
    const span = i => (CAT[i.t].kind === 'wall' ? CAT[i.t].size[0] : 1);
    const d = room.items.find(i => isPortal(i) && Array.from({ length: span(i) }, (_, k) => doorFront(i, k)).some(([x, z]) => x === cx && z === cz));
    if (!d) { doorNear = 0; return; }
    if (doorNear !== d.id) { doorNear = d.id; toast(`<span>${d.link && rooms.some(r => r.id === d.link) ? `Door to ${roomTitle(d.link)}` : 'A door to somewhere new'}</span>`, 1200, true); }
    const face = doorFront(d)[2];
    let dh = P.heading - face; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
    if (Math.abs(dh) < 0.8 && (P.manual > view.t || P.state === 'walk')) {
      doorCool = now + 1500;
      if (d.link && rooms.some(r => r.id === d.link)) walkThrough(d, d.link, { c: me.c, name: me.name });
      else doorPicker(d);
    }
  }
  function doorPicker(door, relink) {
    const body = $('#sheetBody'); delete body.dataset.dashboardFont; delete body.dataset.tool; body.innerHTML = '';
    const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; body.appendChild(el); return el; };
    h('div', 'grab'); h('h2', '', 'Where does this door go?');
    h('p', 'muted', 'Pick one of your rooms, or start a new one. Walking through brings you back the same way.');
    const list = h('div', 'cards');
    const me = view.fp && room.get(view.fp.id), asCat = me ? { c: me.c, name: me.name } : null;
    const stick = id => { const clean = !isEdited(); door.link = id; if (isSaved()) { patchSaved(meta.current, d => d.items.forEach(i => { if (i.id === door.id) i.link = id; })); if (clean) baseSig = sig(); } };
    const link = id => { pushUndo(); stick(id); changed(); save(); closeSheets(); if (relink) toast(`<span>This door now goes to ${roomTitle(id)}</span>`, 1500); else walkThrough(door, id, asCat); };
    rooms.filter(r => r.id !== meta.current).forEach(r => {
      const b = document.createElement('button'); b.className = 'card room';
      b.innerHTML = `<div class="art">🚪</div><b>${r.name}</b><span>${r.n} thing${r.n === 1 ? '' : 's'}</span>`;
      b.onclick = () => link(r.id); list.appendChild(b);
    });
    const nb = document.createElement('button'); nb.className = 'card random';
    nb.innerHTML = `<div class="art">✨</div><b>A new room</b><span>An empty room through this door.</span>`;
    nb.onclick = () => {
      const from = meta.current, id = Date.now();
      closeSheets();
      leaveThen(() => {
        pushUndo(); stick(id); save();
        exitCat(true);
        newRoom('blank', id);
        backDoor(from, CAT[door.t].kind === 'wall' ? { k: door.k, u: door.u, t: door.t, c: door.c } : null);
        changed(); commit(true); discover('openhouse');
      });
    };
    list.appendChild(nb);
    openSheet();
  }
  function switchRoom(id, asked) {
    if (id === meta.current) return;
    if (!asked) { leaveThen(() => switchRoom(id, true)); return; }
    exitCat(true);
    if (!loadRoom(id)) { toast('<span>Couldn’t open that room</span>', 1500); return; }
    undo.length = 0; baseSig = sig(); save();
    view.panGoal.set(0, 0, 0); view.zoomGoal = 1;
    changed(); updateHeader();
    toast(`<b>${room.name}</b>`, 1200); Sound.turn();
  }
  function deleteRoom(id) {
    if (rooms.length < 2) { toast('<span>Keep at least one room</span>', 1400); return; }
    const r = rooms.find(x => x.id === id);
    if (!confirm(`Delete “${r ? r.name : 'this room'}”? This can’t be undone.`)) return;
    rooms = rooms.filter(x => x.id !== id);
    if(store.get('lr.mainBedroom',null)===id)store.del('lr.mainBedroom');
    store.del('lr.room.' + id);
    roomSnapshots.remove(id);
    if (id === meta.current) { loadRoom(rooms[0].id); baseSig = sig(); undo.length = 0; changed(); save(); updateHeader(); }
    saveIndex(); saveMeta(); renderMenu();
  }
  function roomVillage(parent) {
    const newFlow=()=>{const sec=[...$('#sheetBody').querySelectorAll('h2')].find(e=>/Start a new room/.test(e.textContent));if(sec){sec.scrollIntoView({behavior:view.reducedMotion?'auto':'smooth',block:'start'});sec.classList.remove('flash');void sec.offsetWidth;sec.classList.add('flash');}Sound.blip();};
    villageView=LRRoomViews.mount({parent,store,CAT,current:()=>meta.current,phase:()=>meta.phase,
      rooms:()=>{
        const list=rooms.slice().sort((a,b)=>a.id-b.id).map(r=>({...r,...((r.id===meta.current?room.serialize():store.get('lr.room.'+r.id,null)) || {items:[]}),id:r.id,name:r.id===meta.current?room.name:r.name}));
        if(!isSaved())list.push({...room.serialize(),id:meta.current,draft:true});
        return list;
      },thumb:d=>d.id===meta.current?captureRoomSnapshot(true):roomSnapshots.get(d.id,meta.phase)?.url,travel:r=>{closeSheets();if(r.id!==meta.current)switchRoom(r.id);},
      save:()=>{commit();renderMenu();},remove:deleteRoom,newRoom:newFlow,
      bedroom:()=>store.get('lr.mainBedroom',null),setBedroom:r=>{
        const selected=store.get('lr.mainBedroom',null)===r.id;
        if(r.draft){if(r.id!==meta.current)return;commit(true);if(!store.get('lr.room.'+r.id,null)){toast('<span>Save this room first, then choose its star.</span>',2400,true);return;}}
        if(selected)store.del('lr.mainBedroom');else store.set('lr.mainBedroom',r.id);
        Sound.click(!selected);toast(`<span>${selected?'Main bedroom cleared · Open the last room visited':'Main bedroom set · '+esc(r.name)}</span>`,2000,true);
        if(r.draft){renderMenu();[...$('#menu-rooms').querySelectorAll('.rooms-card')].find(card=>card.dataset.roomId===String(r.id))?.querySelector('.rooms-bedroom')?.focus({preventScroll:true});}
      }});
  }
  function homeSearch(toggleHost) { return LRHome.createSearch({sources:spaceSources,navigate:navigateSpace,toggleHost}); }
  function renderMenu() {
    frenchUI?.close(false);
    letters.close(false);
    releaseRoomQR();
    villageView?.destroy(); villageView=null;
    home.close(false);
    roomToolsUI.close();
    saveIndex();
    const body = $('#sheetBody'), focused = document.activeElement;
    const focusState = focused?.matches('.toggle') ? {label:focused.textContent,panel:focused.closest('[role=tabpanel]')?.id,top:body.scrollTop} : null;
    body.dataset.merchant = ''; delete body.dataset.tool;
    body.dataset.dashboardFont=meta.dashboardMono?'mono':'default';
    body.innerHTML = '';
    const sections = LRDashboard.menu(body, store, closeSheets);
    const spotlight=homeSearch(body.querySelector('.menu-actions'));body.insertBefore(spotlight,sections.Today);
    spotlight.querySelector('input').addEventListener('input',e=>villageView?.filter(e.target.value));
    let target = sections.Today;
    const h = (tag, cls, html, host=target) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; host.appendChild(el); return el; };
    const todoTab = sections['To-Do'];
    const todoHeading=h('div','todo-heading','',todoTab);h('h2','','To-Do',todoHeading);
    todayUI.mount(target,{openDay:date=>calendar.openDay(date),captions:host=>{LRCaptions.renderDaily(host,captionDesk);},googleToday:host=>googleTasksUI.mount(host,null,{scheduled:true,todayOnly:true}),google:host=>googleTasksUI.mount(host),tasks:todoTab});
    frenchUI.mountToday(target.querySelector('.today-duo'),{flip:true});
    target = sections.Rooms;
    h('h2', '', `Your home <small>· ${rooms.length} room${rooms.length === 1 ? '' : 's'}</small>`);
    roomVillage(target);
    h('p','muted small','Rooms in your home save automatically. New rooms ask before you leave. Tap a star to choose your main bedroom.');
    const pending=store.get('lr.pendingDraft',null);
    if(pending && pending.id!==meta.current){
      const resume=h('button','chipbtn');resume.textContent='Resume unsaved room: '+(pending.data?.name || 'Untitled room');
      resume.onclick=()=>leaveThen(()=>{const probe=new LR.Room();if(!probe.load(pending.data))return;exitCat(true);room.load(probe.serialize());meta.current=pending.id;baseSig=pending.base || sig();undo.length=0;delete meta.visit;store.del('lr.pendingDraft');closeSheets();changed();save();updateHeader();});
    }

    // the house map: which rooms connect to which, with a tap to travel
    const links = rooms.map(r => {
      const d = r.id === meta.current ? room.serialize() : store.get('lr.room.' + r.id, null);
      const doors = d && Array.isArray(d.items) ? d.items.filter(i => CAT[i.t] && CAT[i.t].tap === 'portal') : [];
      return { r, doors };
    });
    if (links.some(l => l.doors.length)) {
      h('h2', '', 'Your house');
      const map = h('div', 'house');
      links.forEach(({ r, doors }) => {
        const row = document.createElement('div'); row.className = 'hroom' + (r.id === meta.current ? ' here' : '');
        row.innerHTML = `<b>${r.name}${r.id === meta.current ? ' <small>you are here</small>' : ''}</b>`;
        const chips = document.createElement('div'); chips.className = 'hdoors';
        if (!doors.length) chips.innerHTML = '<span class="muted small">No doors yet</span>';
        doors.forEach(dd => {
          const to = rooms.find(x => x.id === dd.link);
          const c = document.createElement('button'); c.className = 'hdoor';
          c.textContent = to ? `🚪 ${to.name}` : '🚪 not set';
          c.onclick = () => {
            if (r.id === meta.current) { const live = room.get(dd.id); closeSheets(); if (live) { if (to) walkThrough(live, to.id); else doorPicker(live); } return; }
            closeSheets(); switchRoom(to ? to.id : r.id);
          };
          chips.appendChild(c);
          if (r.id === meta.current) {
            const e = document.createElement('button'); e.className = 'hdoor edit'; e.textContent = 'Change'; e.title = 'Change where this door goes';
            e.onclick = () => { const live = room.get(dd.id); if (live) doorPicker(live, true); };
            chips.appendChild(e);
          }
        });
        row.appendChild(chips); map.appendChild(row);
      });
      h('p', 'muted small', 'Add a door from the Doors tab in Decorate (the free-standing doorway works anywhere, even outside). As a cat, just walk through.');
    }
    const book = store.get('lr.guestbook', []);
    if (book.length) {
      h('h2', '', `Guest book <small>${book.length} note${book.length === 1 ? '' : 's'}</small>`);
      const gb = h('div', 'guestbook');
      book.slice(0, 12).forEach(b => {
        const el = document.createElement('div'); el.className = 'gbentry';
        el.innerHTML = `<i>${STICKER_GLYPHS[b.s] || '✉'}</i><div><b>${esc(b.n)}</b><span>${b.t ? `“${esc(b.t)}”` : 'Left a sticker'}</span><small>${new Date(b.d + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${rooms.some(r => r.id === b.room) ? ' · ' + esc(roomTitle(b.room)) : ''}</small></div>`;
        gb.appendChild(el);
      });
    }
    const sh = h('div', 'rowbtns');
    sh.innerHTML = '<button class="chipbtn" id="bShareCode">Share this room as a code</button><button class="chipbtn" id="bImportCode">Friends’ room cards</button>';
    sh.querySelector('#bShareCode').onclick = () => shareSheet();
    sh.querySelector('#bImportCode').onclick = () => importSheet();
    if (meta.visit && meta.visit.id === meta.current) { const gs = h('div', 'rowbtns'); gs.innerHTML = '<button class="chipbtn primary" id="bSignBook">✍ Sign this room’s guest book</button>'; gs.querySelector('#bSignBook').onclick = () => signSheet(); }
    h('h2', '', 'Start a new room');
    h('p', 'muted', 'New rooms start unsaved, so you can play around. Tap Save to keep one.');
    target.appendChild(presetCards(k => { closeSheets(); leaveThen(() => newRoom(k)); }, true));
    target = sections.Sound;
    const settingsNotes=[];
    const toggle = (label, on, fn) => {
      const parts=label.match(/^(.*?) \((.*)\)$/),name=parts?parts[1]:label;
      if(parts)settingsNotes.push([name,parts[2]]);
      const r = h('button', 'toggle' + (on ? ' on' : ''), `<span>${name}</span><i aria-hidden="true"></i>`);
      r.type='button';r.setAttribute('aria-label',label);
      if(parts)r.title=parts[2];
      r.setAttribute('role','switch'); r.setAttribute('aria-pressed',String(!!on)); r.setAttribute('aria-checked',String(!!on));
      r.onclick = () => { fn(); renderMenu(); };
    };
    const sl=h('section','radio-library');sl.setAttribute('aria-label','My Radio');
    const icons=['📻','🌙','☕','🌧','🌿','🎷','🎹','🌊','🌸','✨','🎧','🔥'];
    const radioGlyph=kind=>'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">'+(kind==='pause'?'<path d="M7 5h4v14H7zM15 5h4v14h-4z"/>':kind==='previous'?'<path d="M6 5h2v14H6zM18 5v14L8 12z"/>':kind==='next'?'<path d="M16 5h2v14h-2zM6 5l10 7-10 7z"/>':'<path d="M7 4l13 8-13 8z"/>')+'</svg>';
    let radioActions;
    {
      const list=stationList(),wanted=meta.music?meta.station:meta.lastStation,index=Number.isInteger(wanted)&&wanted>=0&&wanted<list.length?wanted:0,st=list[index],playing=!!meta.music;
      const el=(tag,cls,text,parent=sl)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;};
      const updateRadio=(fn,focus)=>{const top=body.scrollTop,q=sl.querySelector('.radio-library-search')?.value || '';fn();renderMenu();body.scrollTop=top;const search=body.querySelector('.radio-library-search');if(search){search.value=q;search.dispatchEvent(new Event('input'));}if(focus)body.querySelector(focus)?.focus({preventScroll:true});};
      const hero=el('div','radio-library-hero'),cover=el('div','radio-library-cover','📻',hero);cover.setAttribute('aria-hidden','true');const titles=el('div','radio-library-titles',undefined,hero);el('small','', 'YOUR COLLECTION',titles);el('h2','','My Radio',titles);el('p','muted',`${list.length} station${list.length===1?'':'s'} · offline & saved`,titles);
      radioActions=el('div','radio-library-toolbar');
      const control=(cls,label,glyph,fn)=>{const button=el('button',cls,undefined,radioActions);button.type='button';button.setAttribute('aria-label',label);button.innerHTML=radioGlyph(glyph);button.onclick=()=>updateRadio(fn,'.'+cls);return button;};
      control('radio-library-play',playing?'Pause radio':'Play radio',playing?'pause':'play',()=>playStation(playing?-1:index));
      control('radio-library-prev','Previous station','previous',()=>playStation((index-1+list.length)%list.length)).disabled=list.length<2;
      control('radio-library-next','Next station','next',()=>playStation((index+1)%list.length)).disabled=list.length<2;
      const now=el('p','radio-library-now',playing?'On air · '+st.name:'Ready when you are');now.setAttribute('role','status');
      const search=el('input','radio-library-search');search.type='search';search.placeholder='Find a station';search.setAttribute('aria-label','Find a station');
      const rows=el('ol','radio-library-list'),empty=el('p','muted radio-library-empty','No stations match. Try another name.');empty.hidden=true;
      for(const [n,station] of list.entries()){
        const row=el('li','radio-library-row'+(playing&&n===index?' is-playing':''),undefined,rows);row.dataset.station=n;
        const icon=icons.includes(station.gen?meta.lofiIcon:station.icon)?(station.gen?meta.lofiIcon:station.icon):'📻';
        const edit=el('button','radio-library-icon',icon,row);edit.type='button';edit.title='Change station icon';edit.setAttribute('aria-label','Edit icon for '+station.name);edit.setAttribute('aria-expanded','false');
        const choose=el('button','radio-library-station',undefined,row);choose.type='button';choose.setAttribute('aria-label','Play '+station.name);if(playing&&n===index)choose.setAttribute('aria-current','true');el('b','',station.name,choose);el('small','',station.gen?'Offline · lofi band':'Saved · live stream',choose);choose.onclick=()=>updateRadio(()=>playStation(n),'[data-station="'+n+'"] .radio-library-station');
        const status=el('span','radio-library-channel',playing&&n===index?'On air':String(n+1).padStart(2,'0'),row);status.setAttribute('aria-hidden','true');
        const picker=el('div','radio-library-icon-picker',undefined,row);picker.hidden=true;picker.setAttribute('role','group');picker.setAttribute('aria-label','Choose icon for '+station.name);edit.onclick=()=>{picker.hidden=!picker.hidden;edit.setAttribute('aria-expanded',String(!picker.hidden));};
        for(const symbol of icons){const option=el('button','',symbol,picker);option.type='button';option.setAttribute('aria-label','Use '+symbol+' for '+station.name);option.setAttribute('aria-pressed',String(icon===symbol));option.onclick=()=>updateRadio(()=>{if(station.gen)meta.lofiIcon=symbol;else meta.stations[n-1].icon=symbol;saveMeta();},'[data-station="'+n+'"] .radio-library-icon');}
        if(!station.gen){const remove=el('button','radio-library-remove','×',row);remove.type='button';remove.setAttribute('aria-label','Remove '+station.name);remove.onclick=()=>updateRadio(()=>{if(meta.station===n)playStation(-1,true);else if(meta.station>n)meta.station--;if(meta.lastStation===n)meta.lastStation=0;else if(meta.lastStation>n)meta.lastStation--;meta.stations.splice(n-1,1);saveMeta();},'.radio-library-play');}
      }
      search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase();let shown=0;for(const row of rows.children){row.hidden=!list[Number(row.dataset.station)].name.toLocaleLowerCase().includes(q);if(!row.hidden)shown++;}empty.hidden=!!shown;};
    }
    const utilities=h('nav','radio-utilities');utilities.setAttribute('aria-label','Radio tools');radioActions.appendChild(utilities);const stationDisclosure=h('div','station-add-disclosure'),stationToggle=document.createElement('button');
    stationToggle.type='button';stationToggle.className='station-add-toggle';stationToggle.setAttribute('aria-expanded','false');stationToggle.setAttribute('aria-controls','station-add-form');
    stationToggle.setAttribute('aria-label','Add station');stationToggle.title='Add station';stationToggle.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    utilities.appendChild(stationToggle);
    const add=document.createElement('form');add.id='station-add-form';add.className='addstation';add.hidden=true;add.noValidate=true;add.setAttribute('aria-label','Add a station');stationDisclosure.appendChild(add);sl.insertBefore(stationDisclosure,sl.querySelector('.radio-library-now'));
    stationToggle.onclick=()=>{const expanded=stationToggle.getAttribute('aria-expanded')!=='true';stationToggle.setAttribute('aria-expanded',String(expanded));add.hidden=!expanded;browse.hidden=true;browseToggle.setAttribute('aria-expanded','false');};
    add.innerHTML='<label class="station-field" for="stName">Station name<input id="stName" placeholder="Night jazz" maxlength="40" autocomplete="off"></label><label class="station-field" for="stUrl">Stream link<input id="stUrl" type="url" placeholder="https://…" inputmode="url" autocomplete="url" spellcheck="false" autocapitalize="none"></label><button type="submit" class="chipbtn primary" id="stAdd">Save station</button>';
    add.onsubmit = e => {e.preventDefault();
      const url = add.querySelector('#stUrl').value.trim(), name = add.querySelector('#stName').value.trim() || 'My station';
      if (!/^https?:\/\//i.test(url)) { Sound.nope(); toast('<span>Paste a link that starts with http</span>', 1600, true); return; }
      if (/youtube\.com|youtu\.be/i.test(url)) { Sound.nope(); toast('<span>YouTube can’t play inside the app. Try a direct radio stream link.</span>', 2600, true); return; }
      (meta.stations || (meta.stations = [])).push({ name, url, icon:icons[Math.floor(Math.random()*icons.length)] }); saveMeta(); Sound.chime();
      toast(`<span>Added ${name.replace(/</g, '&lt;')}. Use the arrows to tune in.</span>`, 2000, true); renderMenu(); document.querySelector('#menu-sound .station-add-toggle')?.focus({preventScroll:true});
    };
    const browse=h('section','station-browser');browse.id='station-browser';browse.hidden=true;sl.insertBefore(browse,sl.querySelector('.radio-library-now'));
    const browseToggle=document.createElement('button');browseToggle.type='button';browseToggle.className='station-browse-toggle';browseToggle.title='Browse stations';browseToggle.setAttribute('aria-label','Browse stations');browseToggle.setAttribute('aria-controls',browse.id);browseToggle.setAttribute('aria-expanded','false');browseToggle.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg>';utilities.appendChild(browseToggle);
    browseToggle.onclick=()=>{const expanded=browseToggle.getAttribute('aria-expanded')!=='true';browse.hidden=!expanded;browseToggle.setAttribute('aria-expanded',String(expanded));add.hidden=true;stationToggle.setAttribute('aria-expanded','false');};
    atlasUI.mountRadio(browse);
    target = sections.Settings;
    const settingsPanel=target;target=h('div','settings-toggle-grid');target.setAttribute('aria-label','Settings toggles');
    toggle('Music', !!meta.music, () => setControl('music',!meta.music));
    toggle('Sound', Sound.on, () => setControl('sound',!Sound.on));
    toggle('Vinyl crackle (the soft hiss and pops under the music)', meta.crackle !== false, () => { meta.crackle = meta.crackle === false; Sound.setCrackle(meta.crackle); saveMeta(); });
    toggle('Rain', meta.weather==='rain' || meta.weather==='storm', () => setControl('rain',!(meta.weather==='rain' || meta.weather==='storm')));
    toggle('Calm performance', meta.calmPerformance === true, () => { meta.calmPerformance = meta.calmPerformance !== true; saveMeta(); activity.setCalm(meta.calmPerformance); view.setCalmPerformance(meta.calmPerformance); });
    settingsNotes.push(['Calm performance','Lighter rendering at 30 fps. Antialiasing and GPU preference follow this setting on the next app load.']);
    toggle('Monospace dashboard', meta.dashboardMono===true, () => { meta.dashboardMono=meta.dashboardMono!==true;saveMeta(); });
    // Tool colors: each tool's pastel, or one calm light or dark palette for all of them.
    const themeRow=document.createElement('div');themeRow.className='settings-tool-theme';themeRow.setAttribute('role','radiogroup');themeRow.setAttribute('aria-label','Tool colors');
    const themeLabel=document.createElement('span');themeLabel.className='settings-tool-theme-label';themeLabel.textContent='Tool colors';themeRow.appendChild(themeLabel);
    for(const [id,label] of [['pastel','Pastel'],['light','Light'],['dark','Dark']]){const b=document.createElement('button');b.type='button';b.className='chipbtn';b.textContent=label;b.setAttribute('role','radio');b.setAttribute('aria-checked',String((meta.toolTheme||'pastel')===id));b.onclick=()=>{meta.toolTheme=id;saveMeta();applyToolTheme();renderMenu();};themeRow.appendChild(b);}
    settingsPanel.insertBefore(themeRow,target);
    toggle('Reduced motion', view.reducedMotion, () => setControl('reduced',!view.reducedMotion));
    toggle('Live extras', meta.liveExtras === true, () => { atlas.setEnabled(meta.liveExtras !== true); });
    settingsNotes.push(['Live extras','Public-domain art, aurora watch and Canadian holidays. Radio browsing, book searches, recipes and cat facts connect only when tapped.']);
    toggle('Live weather', meta.liveWeather === true, () => { liveWeather.setEnabled(meta.liveWeather !== true); });
    settingsNotes.push(['Live weather','Uses approximate location with Open-Meteo. Your exact location is never saved or sent. Updates every 30 minutes.']);
    toggle('Dream mode (after midnight the room drifts moon-blue and the music slows)', meta.dreamy !== false, () => { meta.dreamy = meta.dreamy === false; saveMeta(); checkDrift(true); });
    toggle('Night glow (neon, fairy lights and the fire bloom after dark)', meta.glow !== false, () => { meta.glow = meta.glow === false; view.glowOn = meta.glow; saveMeta(); });
    toggle('Cat mischief (cats sometimes knock things over)', meta.mischief !== false, () => { meta.mischief = meta.mischief === false; saveMeta(); });
    toggle('Visitors (a neighbour cat drops by)', meta.visitors !== false, () => { meta.visitors = meta.visitors === false; saveMeta(); });
    toggle('Follow the clock (morning, afternoon, evening, night)', meta.realtime, () => { meta.realtime = !meta.realtime; saveMeta(); if (meta.realtime) setPhase(realPhase(), true); });
    target=settingsPanel;
    const settingsHelp=h('details','settings-help'),helpTitle=document.createElement('summary');helpTitle.textContent='About these settings';settingsHelp.appendChild(helpTitle);
    for(const [name,description] of settingsNotes){const p=document.createElement('p'),b=document.createElement('b');b.textContent=name+': ';p.append(b,document.createTextNode(description));settingsHelp.appendChild(p);}
    if(!meta.realtime){
      const label=h('label','settings-phase');label.textContent='Daypart';
      const select=document.createElement('select');select.setAttribute('aria-label','Daypart');
      Object.entries(LRHome.PHASES).forEach(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;select.appendChild(o);});
      select.value=meta.phase;select.onchange=()=>setPhase(select.value,true);label.appendChild(select);
    }
    h('p', 'muted small', 'Explore: drag to look around, pinch to zoom, double-tap to zoom in, tap lamps, records, plants and cats. Decorate: Add places things (tap or drag), Move drags them, Turn spins them, Paint changes walls, floors and colours, Remove puts things away. Small things like mugs and lamps sit on desks, tables and shelves. On a computer: left-drag or right-drag spins, the wheel zooms (or scrolls the tray when the mouse is over it), middle-drag pans. Keys: 1–5 tools, ←/→ pick from the tray, ↑/↓ switch tabs, R turns the piece you’re placing or the one under the mouse, Delete removes it, Q/E turn the room, X switches Explore/Decorate, G makes a surprise room, M plays music, Ctrl+Z or U undoes, Esc goes back.');
    if (focusState) {
      [...(document.getElementById(focusState.panel)?.querySelectorAll('.toggle') || [])].find(b=>b.textContent===focusState.label)?.focus({preventScroll:true});
      body.scrollTop=focusState.top;
    }
  }

  function showIntro() {
    const intro = $('#intro');
    intro.classList.add('open');
    const cards = $('#introRooms'); cards.innerHTML = '';
    cards.appendChild(presetCards(k => {
      fillRoom(k);
      rooms = [];
      undo.length = 0; store.set('lr.intro', true);
      commit(true); changed(); saveMeta(); updateHeader();
      intro.classList.remove('open'); Sound.init(); Sound.chime();
    }));
  }
  if (!store.get('lr.intro', false)) showIntro();

  // ---------------------------------------------------------------
  // Photo
  $('#bPhoto').onclick = () => {
    const shot = view.snapshot();
    const img = new Image();
    img.onload = () => {
      // tall phone screens crop to a 4:5 portrait around the room, ready for Instagram
      const dpr = img.height / innerHeight;
      let sh = img.height, sy = 0;
      if (img.height > img.width * 1.25) {
        sh = Math.round(img.width * 1.25);
        sy = Math.max(0, Math.min(img.height - sh, Math.round(img.height / 2 - liftNow * dpr - sh / 2)));
      }
      const c = document.createElement('canvas'); c.width = img.width; c.height = sh;
      const g = c.getContext('2d');
      const cs = getComputedStyle(bg).backgroundImage.match(/rgb[a]?\([^)]+\)|#[0-9a-f]{6}/gi) || ['#f8e8d0', '#d8a77e'];
      const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, cs[0]); gr.addColorStop(1, cs[cs.length - 1]);
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      if (document.body.classList.contains('night')) { const si = new Image(); si.src = stars.style.backgroundImage.slice(5, -2); g.globalAlpha = 0.8; g.drawImage(si, 0, 0, c.width, c.height); g.globalAlpha = 1; }
      g.drawImage(img, 0, -sy);
      const s = c.width / 400;
      g.font = `600 ${Math.round(13 * s)}px Fredoka, sans-serif`; g.fillStyle = document.body.classList.contains('night') ? 'rgba(255,255,255,0.8)' : 'rgba(74,53,48,0.7)';
      g.fillText(room.name + ' · Lofi Rooms', 16 * s, c.height - 18 * s);
      const url = c.toDataURL('image/png');
      dashboard.addPhoto(url, `${room.name} · ${new Date().toLocaleDateString()}`);
      $('#photoImg').src = url;
      const dl = $('#photoSave'); if (dl) dl.href = url;
      $('#photo').classList.remove('video'); $('#photo').classList.add('open');
      $('#flash').classList.remove('go'); void $('#flash').offsetWidth; $('#flash').classList.add('go');
      Sound.snap(); discover('photo');
    };
    img.src = shot;
  };
  $('#photoClose').onclick = () => closePhoto();
  function closePhoto() {
    $('#photo').classList.remove('open', 'video');
    const v = $('#photoVid'); v.pause(); v.removeAttribute('src'); v.load();
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }
    videoBlob = null;
    const dl = $('#photoSave'); dl.setAttribute('download', 'lofi-room.png');
  }

  // ---------------------------------------------------------------
  // Timelapse: a whole day in your room, morning to night and back, filmed frame by frame and
  // encoded on the device with Mediabunny (WebCodecs) into a 9:16 video ready for TikTok and Reels.
  let filming = false, filmCancel = false, videoBlob = null, videoUrl = null;
  const FILM = { w: 1080, h: 1920, fps: 30, secs: 16 };
  const STARS = Array.from({ length: 160 }, (_, i) => [((i * 7919) % 1000) / 1000, ((i * 104729) % 997) / 997 * 0.7, 1 + (i % 3)]);
  function paintFrame(g, W, H) {
    const [top, bot, night] = view.sky || ['#f8e8d0', '#d8a77e', 0];
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const sa = Math.min(1, Math.max(0, night - 0.4) * 1.6);
    if (sa > 0) { g.fillStyle = `rgba(255,255,255,${0.75 * sa})`; for (const [x, y, s] of STARS) g.fillRect(x * W, y * H, s * 1.5, s * 1.5); }
    g.drawImage(view.r.domElement, 0, 0, W, H);
    const s = W / 400;
    g.font = `600 ${Math.round(13 * s)}px Fredoka, sans-serif`; g.textAlign = 'center';
    g.fillStyle = night > 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(74,53,48,0.7)';
    g.fillText(room.name + ' · Lofi Rooms', W / 2, H - 40 * s);
  }
  async function filmDay() {
    if (filming) return;
    if (!('VideoEncoder' in window)) { toast('<span>This browser can’t make videos. Try Chrome, or the Android app.</span>', 2800, true); return; }
    closePhoto(); closeSheets(); exitCat(true);
    const { w: W, h: H, fps: FPS, secs } = FILM, F = FPS * secs, seg = F / 4;
    const ov = $('#filming'), bar = $('#filmBar'), label = $('#filmPct');
    filming = true; filmCancel = false; ov.classList.add('open'); bar.style.width = '0%'; label.textContent = 'Getting the camera ready…';
    let out = null, mp4 = true;
    const phase0 = meta.phase, order = PHASE_ORDER, start = Math.max(0, order.indexOf(phase0));
    try {
      const mb = await import('mediabunny');
      const codec = await mb.getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'], { width: W, height: H });
      if (!codec) throw new Error('nocodec');
      mp4 = codec === 'avc';
      out = new mb.Output({ format: mp4 ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' }) : new mb.WebMOutputFormat(), target: new mb.BufferTarget() });
      const frame = document.createElement('canvas'); frame.width = W; frame.height = H;
      const g = frame.getContext('2d');
      const src = new mb.CanvasSource(frame, { codec, bitrate: mb.QUALITY_HIGH, keyFrameInterval: 2 });
      out.addVideoTrack(src, { frameRate: FPS });
      await out.start();
      view.beginCapture(W, H);
      view.setPhase(order[start], true); view.refreshEnv(order[start]);
      const yaw0 = view.yaw, t0 = t;
      for (let i = 0; i < F; i++) {
        if (filmCancel) break;
        const k = Math.floor(i / seg), lt = (i % seg) / seg, to = order[(start + k + 1) % 4];
        if (i % seg === 0) view.setPhase(to);
        if (i % seg === Math.floor(seg / 2)) view.refreshEnv(to);   // windows switch their sky halfway
        const e = Math.min(1, Math.max(0, (lt - 0.2) / 0.65));     // linger a moment at each time of day
        view.phaseT = e * e * (3 - 2 * e);
        view.yaw = view.yawGoal = yaw0 + Math.sin(i / F * Math.PI * 2) * 0.22;   // a slow, gentle sway
        view.frame(1 / FPS, t0 + i / FPS);
        paintFrame(g, W, H);
        await src.add(i / FPS, 1 / FPS);
        if (i % 6 === 0) {
          const pct = Math.round(i / F * 100);
          bar.style.width = pct + '%'; label.textContent = `Filming a day in ${room.name}… ${pct}%`;
          await new Promise(r => setTimeout(r, 0));
        }
      }
      if (filmCancel) { await out.cancel(); out = null; }
      else { label.textContent = 'Developing the film…'; await out.finalize(); }
    } catch (err) {
      if (out) try { await out.cancel(); } catch (e) { /* already closed */ }
      out = null;
      toast(`<span>${err && err.message === 'nocodec' ? 'This device can’t encode video, sorry' : 'The timelapse didn’t work this time'}</span>`, 2600, true);
    } finally {
      view.endCapture();
      view.setPhase(phase0, true); view.refreshEnv(phase0);
      filming = false; ov.classList.remove('open');
    }
    if (!out) return;
    videoBlob = new Blob([out.target.buffer], { type: mp4 ? 'video/mp4' : 'video/webm' });
    videoUrl = URL.createObjectURL(videoBlob);
    const v = $('#photoVid'); v.src = videoUrl; v.play().catch(() => { /* muted autoplay may still be blocked */ });
    const dl = $('#photoSave'); dl.href = videoUrl; if (dl.hasAttribute('download')) dl.setAttribute('download', 'lofi-room-day.' + (mp4 ? 'mp4' : 'webm'));
    $('#photo').classList.add('open', 'video');
    Sound.chime(); discover('photo');
  }
  $('#photoFilm').onclick = () => filmDay();
  $('#filmCancel').onclick = () => { filmCancel = true; };
  // in the app, hand the picture to Android's share sheet (Instagram, Photos, Messages…)
  const cap = window.Capacitor;
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    const shareBtn = $('#photoSave');
    shareBtn.textContent = 'Share';
    shareBtn.removeAttribute('download');
    shareBtn.onclick = async e => {
      e.preventDefault();
      try {
        const fsys = cap.registerPlugin('Filesystem'), share = cap.registerPlugin('Share');
        let data = $('#photoImg').src.split(',')[1], ext = 'png';
        if (videoBlob) {
          data = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = no; fr.readAsDataURL(videoBlob); });
          ext = videoBlob.type === 'video/mp4' ? 'mp4' : 'webm';
        }
        const file = await fsys.writeFile({ path: `lofi-room-${Date.now()}.${ext}`, data, directory: 'CACHE' });
        await share.share({ title: 'My Lofi Room', files: [file.uri] });
      } catch (err) {
        if (!/cancel/i.test(String(err && err.message))) toast('<span>Couldn’t open the share sheet</span>', 2000);
      }
    };
    $('#photo p').textContent = 'Share it, or long-press the picture to copy it';
  }

  // ---------------------------------------------------------------
  // Save
  let dirty = fresh || (isSaved() && isEdited());
  function saveMeta() { store.set('lr.meta', meta); }
  function saveIndex() { store.set('lr.rooms', rooms); }
  // One shared saved-photo cache for room cards and future room pickers. Use the
  // photo capture path (which hides private tool surfaces), never redraw decor.
  function captureRoomSnapshot(force=false) {
    if(!view.room || view.room!==room || snapshotRoomId!==meta.current || view.capturing)return null;
    if(force)return view.snapshot(360);
    return roomSnapshots.capture({...room.serialize(),id:meta.current},meta.phase,()=>{
      return Object.fromEntries(['morning','day','evening','night'].map(p=>[p,view.snapshot(240,p)]));
    },force);
  }
  // Saved every three real seconds; also flushed before travel, on pause and on close.
  function save() {
    if (care) care.flush();
    if(isSaved()){
      store.set('lr.room.'+meta.current,room.serialize());
      captureRoomSnapshot();
      const entry=rooms.find(r=>r.id===meta.current);entry.name=room.name;entry.n=room.items.filter(i=>!i.visitor).length;
      baseSig=sig();saveIndex();updateSaveChip();
    }
    try { put('lr.draft', JSON.stringify({ id: meta.current, base: baseSig, data: room.serialize() })); } catch (e) { /* quota */ }
    saveMeta();
    dirty = false;
  }
  // put this room in your home, or update it there
  function commit(quiet) {
    try { put('lr.room.' + meta.current, JSON.stringify(room.serialize())); } catch (e) { /* quota */ }
    const isNew = !isSaved();
    const r = rooms.find(x => x.id === meta.current) || (rooms.push({ id: meta.current }), rooms[rooms.length - 1]);
    r.name = room.name; r.n = room.items.length;
    baseSig = sig(); save(); saveIndex(); updateHeader();
    if (!quiet) { toast(`<b>${isNew ? 'Saved to your home' : 'Changes saved'}</b><span>${room.name}</span>`, 1600, true); Sound.stamp(); }
  }
  // house keeping that should stick without asking (door links, the door back): patch the saved copy only
  function patchSaved(id, fn) {
    const d = store.get('lr.room.' + id, null); if (!d) return;
    fn(d); try { put('lr.room.' + id, JSON.stringify(d)); } catch (e) { /* quota */ }
  }
  // House rooms save quietly. Only an edited unsaved room asks to be kept.
  function leaveThen(next) {
    if (isSaved()) { save(); next(); return; }
    if (!isEdited()) { next(); return; }
    codeSheet(`Keep “${room.name}”?`, 'This room isn’t in your home yet. Save it, or let it go.', h => {
      const row = h('div', 'rowbtns');
      row.innerHTML = `<button class="chipbtn primary" id="lvSave">Save to my home</button><button class="chipbtn" id="lvDrop">Let it go</button><button class="chipbtn" id="lvStay">Stay here</button>`;
      row.querySelector('#lvSave').onclick = () => { closeSheets(); commit(true); next(); };
      row.querySelector('#lvDrop').onclick = () => { closeSheets(); next(); };
      row.querySelector('#lvStay').onclick = () => closeSheets();
    });
  }
  $('#bSave').onclick = () => { Sound.init(); commit(); };
  if (fresh) commit(true);
  setInterval(() => { if (dirty) save(); }, 3000);
  setTimeout(() => checkDrift(), 1500);
  if (care) { care.prune(new Set(rooms.map(r => r.id).concat(meta.current))); care.tick(0); setInterval(() => care.tick(1), 1000); }   // the living room's heartbeat, on real time   // after midnight, the app opens already drifting
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);

  // ---------------------------------------------------------------
  // Android: back button closes overlays first, pausing saves to disk
  const app = window.Store && window.Store.app;
  if (app) {
    app.addListener('pause', () => { roomToolsUI.flush(); letters.flush(); save(); window.Store.flush(); if (Sound.ctx) Sound.ctx.suspend(); });
    app.addListener('resume', () => { if (Sound.ctx && Sound.on) Sound.ctx.resume(); liveWeather.refresh(); });
    app.addListener('backButton', () => {
      if (frenchUI?.active) frenchUI.close();
      else if (barnaby.active) barnaby.close();
      else if (library.active) library.close();
      else if (home.active) home.close();
      else if (letters.active) letters.close();
      else if (rituals.breath.active) stopBreathing();
      else if (filming) filmCancel = true;
      else if (crateOpen) closeCrate();
      else if ($('#photo').classList.contains('open')) closePhoto();
      else if (sheet.classList.contains('open')) closeSheets();
      else if (state.mode === 'edit') setMode('explore');
      else { save(); window.Store.flush(); app.minimizeApp(); }
    });
  }

  // ---------------------------------------------------------------
  // Main loop
  let last = performance.now(), t = 0, soundT = 0, clockT = 0, momentT = 0, worldT = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    updateRituals(); home.tick(now); todayUI.tick(now); googleTasksUI.tick(now); atlas.tick();
    view.weatherIntensity=liveWeather.intensity;
    const liftGoal = state.mode === 'edit' ? (innerWidth < 760 ? 84 : 60) : (innerWidth < 760 ? 24 : 16);
    liftNow += (liftGoal - liftNow) * Math.min(1, dt * 6);
    soundT += dt;
    if (soundT > 0.3) { Sound.soundscape(soundState(soundT)); soundT = 0; }
    clockT += dt;
    if (clockT > 20) { clockT = 0; wardrobe.sync(); if (meta.realtime && realPhase() !== meta.phase) setPhase(realPhase()); checkDrift(); liveWeather.refresh(); }
    momentT += dt;
    worldT += dt;
    if (worldT >= 1) { driftPaper.update();try{press.track(roomTools.state.tally);}catch(e){/* records are optional */}googleCalendar.check();calendar.refresh();tickWorld(worldT); roomToolsUI.tick(!document.hidden && !library.active && !letters.active && !barnaby.active && !frenchUI?.active && !rituals.breath.active && !filming); worldT = 0; }
    if (momentT > 2) {
      momentT = 0;
      if (view.petNapping()) discover('catnap');
      const fire = room.items.some(i => CAT[i.t].anim === 'fire' && i.on);
      if (meta.raining && fire && meta.music) discover('stormy');
      if (meta.raining && fire && meta.phase === 'night') discover('snowedin');
      if (meta.phase === 'day' && !meta.raining) {
        const sun = view.windowSpots().filter(w => room.items.some(i => CAT[i.t].beam && i.on));
        if ([...view.pets.values()].some(P => P.state === 'nap' && sun.some(w => Math.hypot(w.x + 0.5 - P.x, w.z + 0.5 - P.z) < 3))) discover('siesta');
      }
      if ([...view.pets.values()].some(P => P.perch && !P.hop)) discover('perch');
    }
    if (view.fp) catDoors(now);
    if (view.fp && held.size) {
      const f = (held.has('w') || held.has('ArrowUp') ? 1 : 0) - (held.has('s') || held.has('ArrowDown') ? 1 : 0);
      const sd = (held.has('d') ? 1 : 0) - (held.has('a') ? 1 : 0), turn = (held.has('ArrowLeft') ? 1 : 0) - (held.has('ArrowRight') ? 1 : 0);
      if (turn) view.fp.look += turn * dt * 2.2;
      view.catMove(f, sd, dt);
    }
    view.beat = meta.music && !stream && !view.reducedMotion ? Sound.beat() : -1;   // the groove: lights pulse and cats bop on the beat
    if (!filming && !barnaby.active) { view.frame(dt, t, false); if (widgetView) widgetView.frame(); roomToolsUI.frame(dt); dashboard.frame(); atlasUI.frame(); }
    view.reportActivity();
    activity.report('filming/photo', filming || $('#photo').classList.contains('open'));
    activity.report('pointer', activePointers.size > 0);
    activity.report('room lift', Math.abs(liftGoal-liftNow) > .001);
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) liveWeather.refresh(); });
  window.addEventListener('resize', () => view.resize());
  companion = LRCompanion.create({ view, room, slots: wardrobe.slots, onWardrobe: wardrobeSheet, environment: () => ({ roomId: meta.current, editing: state.mode === 'edit', hour: new Date().getHours(), phase: meta.phase, weather: meta.weather, dream: driftNow(), beat: view.beat, quiet: home.active || library.active || letters.active || barnaby.active || frenchUI?.active || rituals.breath.active || filming || document.hidden || $('#intro').classList.contains('open') || $('#photo').classList.contains('open') }) });
  view.companion = companion;
  const cozy = LRCozyFurniture.createView({pixelArt:it=>roomTools.pixelPoster(meta.current,it.id),store,model:LRCozyFurniture.create({store}),view,room,roomId:()=>meta.current,files,wardrobe,companion:()=>companion,sheet:codeSheet,close:closeSheets,sound:Sound,discover,notice:text=>toast(`<span>${esc(text)}</span>`,2300,true),editing:()=>state.mode==='edit',hidden:()=>library.active || letters.active || barnaby.active || frenchUI?.active || filming || document.hidden || $('#photo').classList.contains('open'),takePhoto:()=>$('#bPhoto').click(),openFiles:()=>dashboard.files('Photos')});
  view.cozyLife = cozy;
  view.petLife = LRPets.createView({view,room,CAT});
  widgetView = LRWidgets.createView({ widgets, view, room, editing: () => state.mode === 'edit', hidden: () => library.active || letters.active || barnaby.active || frenchUI?.active || filming || document.hidden || $('#photo').classList.contains('open') });
  const atlas = LRAtlas.create({store,meta,save:saveMeta,changed:()=>activity.wake()});
  const atlasUI = LRAtlas.createView({model:atlas,view,room,sheet:codeSheet,meta,
    hasStation:url=>(meta.stations || []).some(s=>s.url===url),
    addStation:station=>{if(!(meta.stations || []).some(s=>s.url===station.url)){(meta.stations || (meta.stations=[])).push(station);saveMeta();}},
    hidden:()=>library.active || letters.active || barnaby.active || frenchUI?.active || home.active || filming || view.capturing || document.hidden || $('#photo').classList.contains('open')
  });
  const calendar=LRCalendar.createView({model:calendarModel,google:googleCalendar,sheet:codeSheet,atlas,meta,scenes:()=>files.list('Scenes'),seasons:LR.SEASONS || [],thumb:d=>view.roomThumb(d),openScene:s=>dashboard.openFile('Scenes',s)});
  const digest=LRDigest.create({store,sources:()=>({...pressSources(),scenes:files.list('Scenes'),ideas:roomTools.state.ideas,streak:store.get('lr.dailyStreak',{}),guestbook:store.get('lr.guestbook',[]),catLog:catJournal.entries,events:calendarModel.events()}),brief:src=>press.brief(src),magazine:(issue,src)=>press.magazine(issue,src),arrange:sections=>press.arrange(sections)});
  const digestUI=LRDigest.createView({model:digest,press,sheet:codeSheet,sound:Sound,scenes:()=>files.list('Scenes'),thumb:d=>view.roomThumb(d),openScene:s=>dashboard.openFile('Scenes',s),onRead:()=>driftPaper.update(),notice:text=>toast(`<span>${esc(text)}</span>`,2400,true)});
  driftPaper=LRDigest.createPaper({view,room,model:digest,open:()=>digestUI.open(),hidden:()=>state.mode!=='explore'||home.active||library.active||letters.active||barnaby.active||frenchUI?.active||rituals.breath.active||filming||view.capturing||document.hidden||!!view.fp||$('#intro').classList.contains('open')||$('#photo').classList.contains('open'),notice:text=>toast(`<span>${esc(text)}</span>`,2400,true)});
  driftPaper.update();
  atlas.refresh();
  updateHeader();
  setMode(state.mode, true);
  updateRituals();
  if (meta.music) { meta.music = false; updateHeader(); }   // browsers need a tap before music can play
  const activePointers = new Set();
  const wake = () => activity.wake();
  document.addEventListener('pointerdown', e => { activePointers.add(e.pointerId); wake(); }, {passive:true});
  for (const type of ['pointerup','pointercancel']) window.addEventListener(type, e => { activePointers.delete(e.pointerId); wake(); }, {passive:true});
  window.addEventListener('blur', () => {activePointers.clear(); wake();});
  for (const type of ['pointermove','wheel','keydown','keyup','input','change','click','visibilitychange']) document.addEventListener(type, wake, {passive:true});
  for (const type of ['resize','focus','storage']) window.addEventListener(type, wake, {passive:true});
  const renderLoop = LRPerformance.createLoop({activity,step:loop,fullRate:()=>filming || !!view.capturing || $('#photo').classList.contains('open'),draw:()=>{if(!filming && !barnaby.active)view.draw();}});
  renderLoop.start();
  liveWeather.refresh();
  window.__lr = { openCozyMoments,closeCozyMoments,press,captionStudio,friendCards,friendCardsUI,digest,digestUI,driftPaper,focusGarden,gardenUI,updateFocusGarden, library, barnaby, french: frenchUI, calendar, calendarModel, googleCalendar, atlas, atlasUI, activity, renderLoop, todayTasks, todayUI, liveWeather, cozy, home, files, dashboard, roomTools, roomToolsUI, letters, wardrobe, wardrobeSheet, widgets, widgetView, newspaperSheet, companion, rituals, updateRituals, startBreathing, stopBreathing, merchant, catJournal, tickWorld, shop, openShop, crownSheet, care, FILM, filmDay, openCrate, checkDrift, receiveNote, signSheet, get crateIndex() { return crateI; },  room, view, state, meta, Sound, setPhase, setMode, interact, changed, mischief, visit, roomCode, readCode, discover, dailyInfo, ensureDaily, get rooms() { return rooms; } };   // handy for poking at it from the console
}

// Module dependencies can finish after classic deferred scripts on a cold load.
const rendererReady = window.THREE ? Promise.resolve() : new Promise(resolve => window.addEventListener('lofi-renderer-ready', resolve, { once: true }));
Promise.all([rendererReady, window.Store ? window.Store.ready : Promise.resolve()]).then(startLofiRooms);
