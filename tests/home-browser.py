"""npm run build && python3 tests/home-browser.py. Offline Home launcher and real-sheet navigation."""
import functools,json,re
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
 context=browser.new_context(viewport={'width':390,'height':844})
 context.add_init_script("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.tools',JSON.stringify({v:1,next:2,tea:{status:'ready',notified:true},mail:[{id:'mail-home',title:'HOME_PRIVATE_MAIL',body:'PRIVATE_SEALED_BODY',status:'arrived',read:false,notified:true,deliverOn:'2026-10-01'}]}))")
 external=[]
 def route(r):
  if r.request.url.startswith('http://127.0.0.1:'):r.continue_()
  else:external.append(r.request.url);r.abort()
 context.route('**/*',route)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.home')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='Home room';a.meta.visitors=false;a.meta.realtime=false;a.meta.dreamy=false;a.setMode('explore',true);for(const [t,x,z] of [['phone',1,1],['ideajar',3,1],['kettle',5,1]])a.room.add(a.room.make(t,{x,z}));a.changed();a.letters.model.add('Home room');a.letters.model.rename(a.letters.model.current,'HOME_PRIVATE_LETTER');a.letters.model.update({letterhead:'Home',body:'Private home letter body'});a.files.add('Scenes',{title:'HOME_PRIVATE_SCENE',decor:LRWidgets.shareDecor(a.room.serialize())});a.roomTools.addIdea('HOME_PRIVATE_IDEA');}''')
 page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()");baseline=list(external);view=page.locator('#homeView');body=page.locator('#sheetBody')
 def open_home():page.click('#bHome');assert page.evaluate('__lr.home.active')
 def search(q):page.get_by_role('searchbox',name='Search furniture, letters, scenes, ideas',exact=True).fill(q)
 open_home();page.evaluate('document.querySelector("#bHome").focus()');page.keyboard.press('Tab');assert view.get_by_role('button',name='← Room',exact=True).evaluate('e=>document.activeElement===e');page.keyboard.press('Shift+Tab');assert view.get_by_role('searchbox',name='Search furniture, letters, scenes, ideas',exact=True).evaluate('e=>document.activeElement===e');page.keyboard.press('Tab');assert view.get_by_role('button',name='← Room',exact=True).evaluate('e=>document.activeElement===e');assert view.locator('h2').all_text_contents()==['Control center','Today','Gentle notifications','Search','Coziness status'];assert view.get_by_role('checkbox').count()==0;assert view.locator('.home-app').count()>23;assert view.locator('input[type=range]').count()==0
 assert 'PRIVATE_SEALED_BODY' not in view.inner_text();assert 'Your tea is ready' in view.inner_text();assert 'A letter has arrived' in view.inner_text()
 # The old Home settings live in Settings, retaining their actual engine behavior.
 view.locator('[data-app="settings"]').click()
 def control(label):return page.locator('#menu-settings').get_by_role('switch',name=re.compile('^'+re.escape(label)+r'(?:$| \()'))
 def check(label,on):
  b=control(label)
  if b.evaluate("e=>e.classList.contains('on')")!=on:b.click()
 for value in [True,False,True]:
  check('Rain',value);assert page.evaluate('__lr.meta.weather')==('rain' if value else 'clear')
 check('Follow the clock',False);page.get_by_role('combobox',name='Daypart').select_option('evening');assert page.evaluate('__lr.meta.phase')=='evening'
 check('Follow the clock',True);assert not page.get_by_role('combobox',name='Daypart').is_visible();check('Follow the clock',False)
 for key,label in [('glow','Night glow'),('dreamy','Dream mode')]:
  check(label,False);assert page.evaluate('key=>__lr.meta[key]',key)==False;check(label,True)
 check('Music',True);assert page.evaluate('__lr.meta.music && __lr.meta.station===0');check('Music',False)
 check('Sound',False);assert not page.evaluate('__lr.Sound.on');check('Sound',True)
 check('Reduced motion',True);assert page.evaluate('__lr.view.reducedMotion && document.body.classList.contains("reduce-motion")');assert page.evaluate('JSON.parse(localStorage.getItem("lr.reducedMotion"))')==True
 page.keyboard.press('Escape');open_home()
 assert view.get_by_role('searchbox',name='Search furniture, letters, scenes, ideas',exact=True).is_visible();search('HOME_PRIVATE');assert view.locator('.home-result-group h3').all_text_contents()==['Letters','Scenes','Ideas']
 view.get_by_role('button',name='HOME_PRIVATE_LETTER',exact=True).click();assert not page.evaluate('__lr.home.active');assert page.locator('#letterBody').inner_text()=='Private home letter body';page.click('#letterClose')
 open_home();search('loft');view.get_by_role('button',name='Mezzanine loft bed',exact=True).click();assert page.evaluate('__lr.state.mode')=='edit';assert page.evaluate('__lr.state.add')=='loft';assert page.locator('#tray .swatch').count()==1;assert page.locator('#tray .swatch').get_attribute('data-furniture')=='loft'
 page.get_by_role('button',name='Show all',exact=True).click();assert page.locator('#tray .swatch').count()>1;page.evaluate('__lr.setMode("explore",true)')
 open_home();search('HOME_PRIVATE_IDEA');view.get_by_role('button',name='HOME_PRIVATE_IDEA',exact=True).click();assert body.locator('h2').inner_text()=='The idea jar';assert 'HOME_PRIVATE_IDEA' in body.inner_text();page.keyboard.press('Escape')
 open_home();view.get_by_role('button',name='Your tea is ready',exact=False).click();assert body.locator('h2').inner_text()=='A little pot of tea';page.get_by_role('button',name='Enjoy the tea',exact=True).click();page.keyboard.press('Escape')
 open_home();view.get_by_role('button',name='A letter has arrived',exact=False).click();assert body.locator('h2').inner_text()=='Letters to future you';page.get_by_role('button',name='Read letter',exact=True).click();assert 'PRIVATE_SEALED_BODY' in body.inner_text();page.keyboard.press('Escape')
 open_home();view.locator('.home-daily').click();assert page.locator('#menu-today').is_visible();page.keyboard.press('Escape')
 page.evaluate('__lr.room.name="Changed since scene";__lr.changed()');open_home();search('HOME_PRIVATE_SCENE');view.get_by_role('button',name='HOME_PRIVATE_SCENE',exact=True).click();assert page.evaluate('__lr.room.name')=='Home room'
 # The phone tile uses the local Home action, never window.open or an outbound URL.
 page.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='phone').id)");body.get_by_role('button',name='Home',exact=True).click();assert page.evaluate('__lr.home.active');assert 'open' not in page.locator('#sheet').get_attribute('class')
 search('');page.get_by_role('searchbox',name='Search furniture, letters, scenes, ideas',exact=True).focus();page.set_viewport_size({'width':390,'height':460});page.wait_for_function('document.querySelector("#homeView").getBoundingClientRect().height<=innerHeight');assert view.bounding_box()['height']<=460;assert view.get_by_role('button',name='← Room',exact=True).is_visible()
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert view.evaluate('e=>e.scrollWidth<=e.clientWidth');view.locator('.home-scroll').evaluate('e=>e.scrollTop=0');page.screenshot(path=f'/tmp/home-{phase}-{width}.png')
 page.keyboard.press('Escape');assert not page.evaluate('__lr.home.active');assert page.locator('#bHome').evaluate('e=>document.activeElement===e')
 page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()");page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');assert page.evaluate('__lr.view.reducedMotion')
 open_home();view.locator('[data-app="settings"]').click();check('Reduced motion',False);assert not page.evaluate('__lr.view.reducedMotion');page.keyboard.press('Escape')
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',code);assert 'HOME_PRIVATE' not in json.dumps(decoded);assert 'reducedMotion' not in json.dumps(decoded)
 assert external==baseline,(baseline,external);assert not errors,errors
 print('PASS: toolbar/phone Home, live existing state, app directory, relocated controls and reduced-motion persistence, grouped search and real tool/letter/scene/decor navigation, responsive day/night/Escape, share privacy and no new network or console errors',flush=True)
 browser.close()
server.shutdown()
