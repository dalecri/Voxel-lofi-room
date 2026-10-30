"""Build www first. First person controls the companion, independent of room cats."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.characterFixture){localStorage.characterFixture='1';const base={v:1,n:10,wall:{style:'paint',color:0},floor:{style:'oak'},next:4};const a={...base,name:'Character home',items:[{id:1,t:'roomdoor',k:0,u:3,e:0,c:0,r:0,link:102},{id:2,t:'desk',x:2,z:5,c:0,r:0},{id:3,t:'roomgate',x:7,z:7,c:0,r:0}]},b={...base,name:'Cat home',items:[{id:1,t:'roomdoor',k:0,u:3,e:0,c:0,r:0,link:101},{id:2,t:'cat',x:6,z:6,c:0,r:0}]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:a.name,n:2},{id:102,name:b.name,n:2}],'lr.room.101':a,'lr.room.102':b,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion');assert page.evaluate('__lr.room.items.some(i=>i.t==="cat")') is False
 before=page.evaluate('JSON.stringify(__lr.room.serialize())');page.click('#bCharacter');page.wait_for_function('__lr.view.fp?.id===__lr.companion.id');assert page.evaluate('__lr.companion.brain.controlled');assert not page.evaluate('__lr.companion.object.visible');assert page.locator('#characterbar').is_visible();assert page.locator('#catNext').count()==0;assert page.locator('#characterName').inner_text()=='Little dude'
 start=page.evaluate('({x:__lr.companion.brain.state.x,z:__lr.companion.brain.state.z})');page.wait_for_timeout(300);assert page.evaluate('({x:__lr.companion.brain.state.x,z:__lr.companion.brain.state.z})')==start
 page.keyboard.down('w');page.wait_for_timeout(350);page.keyboard.up('w');page.wait_for_function('!__lr.companion.brain.state.moving');assert page.evaluate('s=>Math.hypot(__lr.companion.brain.state.x-s.x,__lr.companion.brain.state.z-s.z)>.05',start)
 look=page.evaluate('__lr.view.fp.look');page.keyboard.press('q');assert page.evaluate('__lr.view.fp.look')>look
 # Furniture blocks manual motion without altering its saved placement.
 page.evaluate('__lr.view.exitCharacterView();__lr.view.enterCharacterView({x:2.5,z:4.5,heading:0})');page.keyboard.down('w');page.wait_for_timeout(800);page.keyboard.up('w');assert page.evaluate('__lr.companion.brain.state.z')<4.8
 # A real floor tap routes the character to the tapped cell in perspective view.
 page.evaluate('__lr.view.exitCharacterView();__lr.view.enterCharacterView({x:1.5,z:1.5,heading:0});__lr.view.fp.pitch=-.35')
 page.wait_for_timeout(100)
 target=page.evaluate('''()=>{const v=__lr.view,p=v.root.localToWorld(new THREE.Vector3(1.5,0,3.5)).project(v.cam),r=v.r.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}}''');page.touchscreen.tap(target['x'],target['y']);page.wait_for_function('Math.hypot(__lr.companion.brain.state.x-1.5,__lr.companion.brain.state.z-3.5)<.15')
 # Dragging still changes the look direction, and reduced motion has no head bob.
 look=page.evaluate('__lr.view.fp.look');page.mouse.move(195,400);page.mouse.down();page.mouse.move(250,410,steps=5);page.mouse.up();assert page.evaluate('__lr.view.fp.look')!=look
 assert page.evaluate('__lr.view.fp.bob')==0;page.screenshot(path='/tmp/character-view-mobile.png')
 page.click('#characterExit');assert not page.evaluate('__lr.view.fp');assert not page.evaluate('__lr.companion.brain.controlled');assert page.evaluate('__lr.companion.object.visible');assert page.locator('#characterbar').is_hidden();assert page.evaluate('JSON.stringify(__lr.room.serialize())')==before
 page.keyboard.press('c');page.wait_for_function('!!__lr.view.fp');page.keyboard.press('Escape');assert not page.evaluate('__lr.view.fp')
 # Door travel keeps the character/outfit, rather than adding an explorer cat.
 page.click('#bCharacter');page.evaluate('__lr.interact(1)');page.wait_for_function('__lr.room.name==="Cat home" && !!__lr.view.fp');assert page.evaluate('__lr.view.fp.id')=='lampbot';assert page.evaluate('__lr.room.items.filter(i=>i.t==="cat").length')==1;assert not page.evaluate('__lr.room.items.some(i=>i.explorer)');assert page.evaluate('__lr.view.objs.get(2).visible');assert not page.evaluate('__lr.view.pets.get(2).manual>__lr.view.t')
 page.evaluate('__lr.interact(1)');page.wait_for_function('__lr.room.name==="Character home" && !!__lr.view.fp');assert not page.evaluate('__lr.room.items.some(i=>i.t==="cat")')
 page.click('#characterExit');page.set_viewport_size({'width':1280,'height':900});page.click('#bCharacter');page.screenshot(path='/tmp/character-view-desktop.png');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.keyboard.press('Escape');page.click('#bHome');page.locator('#homeView').wait_for();assert not page.evaluate('__lr.view.fp')
 # New rooms reached through an unlinked doorway also retain character view.
 page.keyboard.press('Escape');page.click('#bCharacter');page.evaluate('__lr.view.exitCharacterView();__lr.view.enterCharacterView({x:7.5,z:8.5,heading:0});__lr.interact(3)');page.locator('#sheetBody .cards .card.random').wait_for();assert page.evaluate('!!__lr.view.fp')
 page.locator('#sheetBody .cards .card.random').click();page.wait_for_function('![101,102].includes(__lr.meta.current)&&!!__lr.view.fp');assert page.evaluate('__lr.view.fp.id')=='lampbot';assert not page.evaluate('__lr.room.items.some(i=>i.explorer||i.t==="cat")');page.click('#characterExit')
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'lampbot' not in raw;assert 'controlled' not in raw;assert 'explorer' not in raw;assert not errors,errors
 print('PASS character view: no-cat entry, keyboard/touch/drag, collision and no drift, exit/autonomy, reduced motion, door round trip with resident cats untouched, responsive UI and private room state')
 browser.close()
server.shutdown()
