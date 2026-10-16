"""npm run build && python3 tests/pets-browser.py. Real cat paths and pet furniture at mobile/desktop widths."""
import functools
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
 context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script("localStorage.setItem('lr.intro','true')")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.view.petLife')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='A little pet corner';a.meta.current=876;a.meta.visitors=false;a.meta.mischief=false;a.meta.realtime=false;a.meta.dreamy=false;a.meta.music=false;a.Sound.on=false;a.setPhase('day',true);a.setMode('explore',true);a.renderLoop.stop();
 window.addPetPiece=(t,o)=>{const it=a.room.make(t,o);if(!a.room.canPlace(it))throw Error('Cannot place '+t);a.room.add(it);a.changed();return it.id;};window.advancePets=seconds=>{for(let k=0;k<seconds*20;k++){a.view.t+=.05;a.view.updatePets(.05,a.view.t);}};
 window.cat=addPetPiece('cat',{x:1,z:3,c:0});window.perch=addPetPiece('windowperch',{x:4,z:2});a.view.pets.get(cat).timer=0;
 }''')
 # With only the window perch as a favorite, normal decisions eventually settle on it.
 assert page.evaluate('''() => {const P=__lr.view.pets.get(cat);for(let k=0;k<1200;k++){advancePets(.05);if(P.perch?.owner===perch&&!P.hop)return true;}return false;}''')
 assert page.evaluate('__lr.view.pets.get(cat).state')=='sit'
 page.evaluate('''() => {const a=__lr,P=a.view.pets.get(cat);P.timer=0;advancePets(.6);window.post=addPetPiece('scratchpost',{x:7,z:5});P.timer=20;if(!a.view.petLife.choose(P,'scratch'))throw Error('scratch path unavailable');}''')
 assert page.evaluate('''() => {const P=__lr.view.pets.get(cat);for(let k=0;k<200;k++){advancePets(.05);if(P.petActivity?.kind==='scratch')return true;}return false;}''')
 assert page.evaluate('Math.abs(__lr.view.objs.get(cat).userData.inner.rotation.x)>0')
 page.evaluate("advancePets(10.2);window.jar=addPetPiece('treatjar',{x:2,z:6});const P=__lr.view.pets.get(cat);P.timer=30;P.state='sit';__lr.interact(jar)")
 assert page.evaluate('!!__lr.view.pets.get(cat).eat || __lr.view.pets.get(cat).state==="eat"')
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.found")).includes("feast")')
 assert page.evaluate('''() => {const P=__lr.view.pets.get(cat);for(let k=0;k<200;k++){advancePets(.05);if(P.state==='eat')return true;}return false;}''')
 print('PASS: autonomous window perch/gaze, adjacent scratching pose, real treat tap summons and existing feast ritual',flush=True)
 # Every new asset has an actual thumbnail in both palettes.
 images=page.evaluate('''() => LRPets.IDS.flatMap(id=>LR.CAT[id].vars.map((_,c)=>({name:LR.CAT[id].name,url:__lr.view.thumb({t:id,c,on:true})})))''')
 gallery=context.new_page();gallery.set_viewport_size({'width':900,'height':1750});gallery.set_content('<body style="background:#e7dac5;color:#4a4039;font:13px sans-serif"><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px">'+''.join('<div style="text-align:center;background:#fff5e4;border-radius:10px;padding:4px"><img width="96" height="96" src="'+i['url']+'"><br>'+i['name']+'</div>' for i in images)+'</div></body>');gallery.screenshot(path='/tmp/pet-pack-contact-sheet.png',full_page=True);gallery.close()
 # Place all 28 and a dog in an actual larger room. Test animation/removal without leaking runtime state.
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=24;window.placed=[];let n=0;for(const id of LRPets.IDS){const C=LR.CAT[id],o=C.kind==='wall'?{k:0,u:2+(n++%6)*3,e:0}:{x:1+(n%6)*3,z:2+Math.floor(n++/6)*4};placed.push(addPetPiece(id,o));}window.dog=addPetPiece('mxdog',{x:0,z:0});a.view.t=10;advancePets(30);a.view.frame(0,a.view.t);a.view.draw();}''')
 assert page.evaluate('__lr.view.petLife.dogs.get(dog).state')=='sleep'
 assert page.evaluate('''() => [...__lr.view.objs.values()].every(o=>o.position.toArray().every(Number.isFinite))''')
 for width in [390,1280]:
  page.set_viewport_size({'width':width,'height':844});page.evaluate('__lr.view.resize();__lr.view.frame(.1,__lr.view.t+.1);__lr.view.draw()');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/pet-room-day-{width}.png')
 page.evaluate('__lr.setPhase("night",true);__lr.view.setPhase("night",true);__lr.view.frame(.1,__lr.view.t+.1);__lr.view.draw()');page.screenshot(path='/tmp/pet-room-night.png')
 page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click();page.get_by_role('switch',name='Reduced motion',exact=True).click();page.keyboard.press('Escape');page.evaluate('advancePets(3)');assert page.evaluate('''() => {const i=__lr.room.items.find(i=>i.t==='hamstercage');return __lr.view.objs.get(i.id).userData.parts.wheel.rotation.z===0;}''')
 code=page.evaluate('__lr.roomCode()');data=page.evaluate('c=>__lr.readCode(c)',code);assert len(data['items'])==29
 assert all(k not in str(data) for k in ['petActivity','petPending','petSlipUntil','petExcitedUntil'])
 assert not errors,errors
 print('PASS: 28 pieces/two palettes, larger room/dog bed, wheel/mouse motion, reduced motion, mobile/desktop/day/night, ordinary decor shares, no console errors',flush=True)
 browser.close()
server.shutdown()
