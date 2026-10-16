"""npm run build && python3 tests/app-shortcut-browser.py. Private configurable app shortcut above the paw."""
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
 button=page.locator('#bAppShortcut');body=page.locator('#sheetBody');home=page.locator('#homeView')
 assert button.get_attribute('aria-label')=='Choose room shortcut'
 button.click();assert body.locator('h2').inner_text()=='Room shortcut';assert body.locator('[data-shortcut=typewriter]').is_visible()
 body.get_by_role('searchbox',name='Find a shortcut app',exact=True).fill('typewriter');assert body.locator('[data-shortcut]').count()==1;body.locator('[data-shortcut=typewriter]').click();assert page.evaluate("JSON.parse(localStorage.getItem('lr.appShortcut'))")=='typewriter';assert button.get_attribute('aria-label')=='Open Typewriter';assert button.evaluate('e=>e===document.activeElement')
 button.click();assert page.locator('#letterBody').is_visible();page.locator('#letterBody').fill('PRIVATE_SHORTCUT_DRAFT');page.click('#letterClose')
 page.click('#bHome');home.get_by_role('button',name='Set room shortcut',exact=True).click();assert body.locator('[data-shortcut=typewriter]').get_attribute('aria-pressed')=='true';body.locator('[data-shortcut=tea]').click();button.click();assert body.locator('h2').inner_text()=='A little pot of tea';esc()
 # Private user-added apps come from the live Control Centre directory too.
 page.evaluate("__lr.files.addPortal('PRIVATE_SHORTCUT_APP','https://example.com/private-shortcut');window.opened=[];window.open=(...args)=>opened.push(args);void 0")
 page.click('#bHome');assert home.get_by_role('button',name='Set room shortcut',exact=True).is_visible();assert home.locator('[data-app]').filter(has_text='PRIVATE_SHORTCUT_APP').count()==1;home.get_by_role('button',name='Set room shortcut',exact=True).click();body.get_by_role('button',name='PRIVATE_SHORTCUT_APP',exact=True).click();button.click();assert page.evaluate('opened')==[['https://example.com/private-shortcut','_blank','noopener,noreferrer']],page.evaluate('({opened,shortcut:localStorage.getItem("lr.appShortcut"),label:document.querySelector("#bAppShortcut").ariaLabel})')
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert all(t not in raw for t in ['PRIVATE_SHORTCUT_APP','private-shortcut','appShortcut','PRIVATE_SHORTCUT_DRAFT'])
 page.reload(wait_until='networkidle');ready();assert button.get_attribute('aria-label')=='Open PRIVATE_SHORTCUT_APP'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':844});a=button.bounding_box();paw=page.locator('#bCat').bounding_box();assert a['y']+a['height']<=paw['y'];assert a['width']>=44 and a['height']>=44;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/app-shortcut-{phase}-{width}.png')
 # A vanished custom destination fails gently into the picker, without opening a stale URL.
 page.evaluate("const s=JSON.parse(localStorage.getItem('lr.portals'));s.custom=[];localStorage.setItem('lr.portals',JSON.stringify(s));window.opened=[];window.open=(...args)=>opened.push(args);void 0");button.click();assert body.locator('h2').inner_text()=='Room shortcut';assert page.evaluate('opened')==[];body.get_by_role('button',name='Clear shortcut',exact=True).click();assert page.evaluate("localStorage.getItem('lr.appShortcut')") is None;assert button.get_attribute('aria-label')=='Choose room shortcut'
 button.click();esc();assert not page.locator('#sheet').evaluate("e=>e.classList.contains('open')");assert not errors,errors
 print('PASS shortcut above paw, searchable shared directory, tool/custom URL launch, change/clear, stale destination fallback, selection persistence, private share codes, day/night mobile/desktop and Escape',flush=True)
 browser.close()
server.shutdown()
