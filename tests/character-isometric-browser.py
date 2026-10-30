"""Toolbar order, tool-only radio, combined capture and room-level universal search."""
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
 context.add_init_script('localStorage.setItem("lr.fireflies","10000");localStorage.setItem("lr.shortLinks","false")')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion');assert page.evaluate('__lr.room.items.some(i=>i.t==="cat")') is False


 page.click('#bCharacter')
 assert page.evaluate('__lr.view.cam===__lr.view.fpCam && __lr.companion.brain.controlled')
 page.click('#characterPerspective')
 assert page.evaluate('__lr.view.fp.isometric && __lr.view.cam===__lr.view.isoCam && __lr.companion.object.visible')
 page.wait_for_timeout(300)
 assert page.evaluate('__lr.companion.object.visible')
 page.evaluate('__lr.companion.takeControl({x:5.5,z:3.5,heading:0})')
 before=page.evaluate('({x:__lr.companion.brain.state.x,z:__lr.companion.brain.state.z})')
 page.keyboard.down('w');page.wait_for_timeout(400);page.keyboard.up('w')
 after=page.evaluate('({x:__lr.companion.brain.state.x,z:__lr.companion.brain.state.z})')
 assert abs(after['x']-before['x'])+abs(after['z']-before['z'])>.1
 button=page.locator('#characterDirections [data-key=ArrowRight]');box=button.bounding_box()
 before=page.evaluate('({x:__lr.companion.brain.state.x,z:__lr.companion.brain.state.z})')
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(300);page.mouse.up()
 after=page.evaluate('({x:__lr.companion.brain.state.x,z:__lr.companion.brain.state.z})')
 assert abs(after['x']-before['x'])+abs(after['z']-before['z'])>.1
 assert page.evaluate('__lr.view.cam===__lr.view.isoCam')
 page.screenshot(path='/tmp/character-isometric.png')
 page.click('#characterPerspective');assert page.evaluate('__lr.view.cam===__lr.view.fpCam && !__lr.companion.object.visible')
 page.click('#characterPerspective');page.click('#characterExit')
 assert page.evaluate('!__lr.view.fp && !__lr.companion.brain.controlled && __lr.companion.object.visible')
 assert not errors,errors
 browser.close()
server.shutdown()
print('Isometric controls passed')
