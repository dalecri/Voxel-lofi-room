"""npm run build && python3 tests/cozy-furniture-browser.py. Real furniture, photos and living-room loops."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':1280,'height':900});context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());context.add_init_script("localStorage.setItem('lr.intro','true')")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack or str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.cozy')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=16;a.room.name='Cozy furniture';a.meta.current=601;a.meta.visitors=false;a.meta.mischief=false;a.meta.realtime=false;a.meta.dreamy=false;a.meta.sound=false;a.Sound.on=false;a.setMode('explore',true);
 const add=(t,o)=>{const i=a.room.make(t,o);if(!a.room.canPlace(i))throw Error('Cannot place '+t);a.room.add(i);return i.id;};
 window.ids={};for(const [t,x,z] of [['sushiconveyor',3,6],['harp',10,5],['minifridge',12,5],['sofa',6,11],['armchair',10,11],['cat',2,8],['cat',12,8],['calllaptop',10,8],['tipjar',8,8],['bigrug',2,3],['cloudrug',8,10]])ids[t]=add(t,{x,z});
 for(const [t,k,u,e] of [['streakboard',0,0,3],['photocollage',0,3,1],['whiteboard',0,7,1],['hangingtee',0,11,1],['dreamcatcher',0,13,1],['beadcurtain',1,3,0]])ids[t]=add(t,{k,u,e});
 a.changed();localStorage.setItem('lr.dailyStreak',JSON.stringify({n:9,last:a.dailyInfo().D.date}));a.setPhase('day',true);a.view.zoomGoal=1.3;}''')
 def tap(t):page.evaluate('t=>__lr.interact(ids[t])',t)
 def escape():page.keyboard.press('Escape');assert not page.locator('#sheet').evaluate("e=>e.classList.contains('open')")
 page.wait_for_timeout(1400)
 thumbs=page.evaluate("LRCozyFurniture.IDS.map(t=>({name:LR.CAT[t].name,url:__lr.view.thumb({t,c:0,on:true})}))")
 gallery=context.new_page();gallery.set_viewport_size({'width':800,'height':650});gallery.set_content('<body style="background:#f4eddf;font:16px sans-serif;color:#473f3d"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'+''.join('<div style="text-align:center;background:#e8dfd0;border-radius:12px;padding:10px"><img width="120" height="120" src="'+r['url']+'"><br>'+r['name']+'</div>' for r in thumbs)+'</div></body>');gallery.screenshot(path='/tmp/cozy-furniture-catalog.png');gallery.close()
 page.bring_to_front()
 page.wait_for_function("__lr.cozy.surfaces.get(ids.streakboard)?.signature.includes(',9]')")
 assert page.evaluate("__lr.view.objs.get(ids.sushiconveyor).userData.parts.plate0.position.y===1.375")
 # A passing plate is separately pickable through the real pointer dispatcher.
 hit=page.evaluate('''() => {const a=__lr,obj=a.view.objs.get(ids.sushiconveyor),r=a.view.r.domElement.getBoundingClientRect();for(let n=0;n<6;n++){const part=obj.userData.parts['plate'+n];part.updateWorldMatrix(true,true);const p=part.localToWorld(new THREE.Vector3(0,.37,0)).project(a.view.cam),x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2,h=a.view.pickItem(x,y);if(h?.id===ids.sushiconveyor && /^plate[0-5]$/.test(h.part))return {x,y,part:h.part};}return null;}''')
 assert hit,'No individually pickable conveyor plate'
 page.mouse.click(hit['x'],hit['y'])
 assert not page.evaluate('part=>__lr.view.objs.get(ids.sushiconveyor).userData.parts[part].visible',hit['part'])
 page.wait_for_function("JSON.parse(localStorage.getItem('lr.found')||'[]').includes('sushisupper')",timeout=20000)
 assert page.evaluate("[...__lr.view.pets.values()].some(p=>p.state==='eat')")
 # No cat is needed: another plate goes to the companion with an eating pose and held plate.
 page.evaluate("part=>{__lr.room.items=__lr.room.items.filter(i=>i.t!=='cat');__lr.changed();__lr.interact(ids.sushiconveyor,{part:'plate'+((Number(part.slice(5))+1)%6)})}",hit['part'])
 assert page.evaluate("!!__lr.companion.object.getObjectByName('sushi-snack')")
 assert 'sushisupper' in page.evaluate("JSON.parse(localStorage.getItem('lr.found'))")
 # Pluck a string through the tap dispatcher; no piano voice is used.
 result=page.evaluate('''() => {const a=__lr,orig=a.Sound.harp;let note=null;a.Sound.harp=n=>{note=n};try{a.interact(ids.harp,{part:'string4'})}finally{a.Sound.harp=orig}return {note,pluck:a.view.objs.get(ids.harp).userData.pluck};}''')
 assert result['note']==4 and result['pluck']['index']==4
 assert 'harp' in page.evaluate("JSON.parse(localStorage.getItem('lr.found'))")
 # Take a real camera photo, select it from the cabinet and pin it on the wall.
 page.click('#bPhoto');page.wait_for_function('__lr.files.list("Photos").length===1');page.click('#photoClose')
 photo_id=page.evaluate('__lr.files.list("Photos")[0].id');tap('photocollage');page.get_by_role('button',name='Pin ',exact=False).first.click();assert page.get_by_role('button',name='Unpin ',exact=False).count()==1;escape()
 page.wait_for_timeout(1200)
 assert page.evaluate("__lr.cozy.model.surface(601,ids.photocollage).pins.length") ==1
 assert page.evaluate("__lr.cozy.surfaces.get(ids.photocollage).canvas.toDataURL().length>10000")
 tap('minifridge');page.get_by_role('button',name='Photo magnets',exact=True).click();page.get_by_role('button',name='Pin ',exact=False).first.click();escape()
 assert page.evaluate("__lr.cozy.model.surface(601,ids.minifridge).pins.length")==1
 # Whiteboard autosaves; hanging tee follows the real selected costume.
 tap('whiteboard');page.get_by_role('textbox',name='Whiteboard text').fill('PRIVATE_COZY_THOUGHT\nAnother small idea.');escape()
 page.evaluate("__lr.wardrobe.equip('automata');__lr.companion.setCostume('automata')");page.wait_for_timeout(1200)
 page.wait_for_function("__lr.cozy.surfaces.get(ids.hangingtee)?.signature.includes('automata')")
 tap('hangingtee');assert 'A little wardrobe' in page.locator('#sheetBody').inner_text();escape()
 tap('tipjar');assert page.get_by_role('textbox',name='Goal name').count()==1;escape()
 # Curtain is a normal room door, and reacts to actual companion proximity.
 tap('beadcurtain');assert 'door' in page.locator('#sheetBody').inner_text().lower();escape()
 result=page.evaluate('''() => {const a=__lr,o=a.view.objs.get(ids.beadcurtain),p=a.view.itemPoint(ids.beadcurtain,[4,0,4]);a.companion.object.position.copy(p);a.cozy.frame(.1,a.view.t);return o.userData.brushedUntil>a.view.t;}''');assert result
 # Respect reduced motion for moving decor.
 page.evaluate('''() => {__lr.home.open();}''');page.get_by_role('checkbox',name='Reduced motion',exact=True).check();page.keyboard.press('Escape')
 assert page.evaluate('''() => {const a=__lr;a.cozy.frame(.1,a.view.t);const b=a.view.objs.get(ids.beadcurtain).userData.parts;return Array.from({length:8},(_,n)=>b['bead'+n].rotation.z).every(x=>x===0);}''')
 # Dreamcatcher boosts an already enabled midnight dream, never turns it on by itself.
 page.evaluate("__lr.meta.dreamy=true;Date.prototype.getHours=()=>2;__lr.setPhase('night',true)");page.wait_for_function('__lr.view.driftGoal===1.25')
 page.evaluate("__lr.meta.dreamy=false;__lr.setPhase('day',true)");page.wait_for_function('__lr.view.driftGoal===0')
 # Private canvases are suppressed during snapshots and timelapses.
 assert page.evaluate('''() => {const v=__lr.view,draw=v.draw;let safe=true;v.draw=function(){safe=[...__lr.cozy.surfaces.values()].every(e=>!e.mesh.visible);return draw.call(this)};try{v.snapshot()}finally{v.draw=draw}return safe;}''')
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',code)
 for value in ['PRIVATE_COZY_THOUGHT',photo_id,'lr.cozy','data:image']:assert value not in json.dumps(decoded)
 # Re-add cats and verify favorites use reachable perches and long naps, rather than clipping into a seat.
 page.evaluate("for(const [x,z] of [[2,8],[12,8]])__lr.room.add(__lr.room.make('cat',{x,z}));__lr.changed()")
 assert page.evaluate('''() => {const a=__lr,saved=a.room.serialize(),id=a.meta.current;try{a.room.items=[];a.room.n=10;a.meta.current=602;const seat=a.room.make('sofa',{x:4,z:4}),cat=a.room.make('cat',{x:2,z:4});a.room.add(seat);a.room.add(cat);a.changed();const P=a.view.pets.get(cat.id),wanted=a.cozy.favoriteFor(P),old=Math.random;Math.random=()=>.1;try{a.view.decidePet(P,2,4);}finally{Math.random=old}if(!P.next || P.next.owner!==wanted)return false;for(let i=0;i<60;i++)a.view.updatePets(.1,a.view.t+i*.1);return P.state==='nap' && P.perch.owner===wanted && P.timer>110 && P.y===LR.CAT.sofa.seat/8;}finally{a.room.load(saved);a.meta.current=id;a.changed();}}''')
 for phase in ['day','night']:
  page.evaluate('p=>__lr.setPhase(p,true)',phase)
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(300);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/cozy-furniture-{phase}-{width}.png')
 # Save/reload keeps pins and text, but a fresh share recipient gets only decor.
 page.click('#bSave');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.cozy');page.evaluate('window.ids=Object.fromEntries(__lr.room.items.map(i=>[i.t,i.id]))');tap('whiteboard');assert 'PRIVATE_COZY_THOUGHT' in page.get_by_role('textbox',name='Whiteboard text').input_value();escape()
 context.close()
 fresh=browser.new_context();fresh.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());fresh.add_init_script("localStorage.setItem('lr.intro','true')");recipient=fresh.new_page();recipient.on('pageerror',lambda e:errors.append(e.stack or str(e)));recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');recipient.wait_for_function('!!window.__lr')
 assert recipient.evaluate('async c=>{const loaded=__lr.room.load(await __lr.readCode(c));if(loaded)__lr.changed();return loaded;}',code);assert 'PRIVATE_COZY_THOUGHT' not in recipient.evaluate('localStorage.getItem("lr.cozy") || ""');assert photo_id not in recipient.evaluate('localStorage.getItem("lr.cozy") || ""');assert recipient.evaluate('__lr.files.list("Photos").length')==0
 assert not errors,errors
 print('PASS: all furniture placed, sushi cat/companion dining, harp, real camera/cabinet/photo pins, wardrobe tee, private whiteboard persistence/share/capture, curtain doorway/motion, dream boost, tip jar, cat favorites, mobile/day/night with no errors',flush=True)
 browser.close()
server.shutdown()
