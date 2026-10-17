"""npm run build && python3 tests/pixel-maker-browser.py. Random rooms are independent drafts with a visible Save action."""
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
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script('''if(!sessionStorage.houseFixture){sessionStorage.houseFixture='true';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.draft':{id:102,base:'',data:{...b,name:'Living draft restored'}},'lr.mainBedroom':101,'lr.meta':{current:102,visitors:false,realtime:false,dreamy:false,phase:'day',stations:[{name:'Old station',url:'https://example.com/old.mp3'}]}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 page.evaluate('window.dispatchEvent(new Event("pagehide"))')
 source=page.evaluate('({id:__lr.meta.current,data:JSON.parse(localStorage.getItem("lr.room."+__lr.meta.current))})')
 page.evaluate('__lr.meta.visit={id:__lr.meta.current,host:"Friend"};__lr.changed()')
 assert page.locator('#bGuest').is_visible();assert not page.locator('#bSave').is_visible()
 page.click('#bSurprise')
 assert page.locator('#bSave').is_visible(),'Random rooms need a Save button'
 assert not page.locator('#bGuest').is_visible(),'Random rooms must not inherit the guest book'
 assert page.evaluate('__lr.meta.current')!=source['id']
 assert page.evaluate('id=>JSON.parse(localStorage.getItem("lr.room."+id))',source['id'])==source['data']
 assert not page.evaluate('__lr.rooms.some(r=>r.id===__lr.meta.current)')
 random_id=page.evaluate('__lr.meta.current');page.evaluate('window.dispatchEvent(new Event("pagehide"))');assert page.locator('#bSave').is_visible()
 assert not page.evaluate('id=>!!localStorage.getItem("lr.room."+id)',random_id)
 page.click('#bUndo');assert page.evaluate('__lr.meta.current')==source['id'];assert page.locator('#bGuest').is_visible()
 page.click('#bSurprise');page.click('#bSave');saved_id=page.evaluate('__lr.meta.current');assert page.evaluate('__lr.rooms.some(r=>r.id===__lr.meta.current)');assert not page.locator('#bSave').is_visible();assert not page.locator('#bGuest').is_visible()
 page.click('#bSurprise');assert page.locator('#bSave').is_visible();assert page.evaluate('__lr.meta.current')!=saved_id
 page.click('#bUndo');assert page.evaluate('__lr.meta.current')==saved_id;assert not page.locator('#bSave').is_visible();assert page.evaluate('id=>!!localStorage.getItem("lr.room."+id)',saved_id)
 page.set_viewport_size({'width':1280,'height':844});page.click('#bSurprise');page.evaluate('window.dispatchEvent(new Event("pagehide"))');assert page.locator('#bSave').is_visible();assert not page.locator('#bGuest').is_visible();page.screenshot(path='/tmp/random-room-save-desktop.png')
 assert not errors,errors;print('PASS random drafts show Save, clear guest state, preserve house rooms and undo, and save explicitly',flush=True)
 browser.close()
server.shutdown()
