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
 def open_home():
  for _ in range(2):
   if page.locator('#sheet').evaluate("e=>e.classList.contains('open')"):page.keyboard.press('Escape')
  page.click('#bHome');assert page.evaluate('__lr.home.active')
 def search(q):
  if page.evaluate('__lr.home.active'):page.keyboard.press('Escape')
  if not page.locator('#sheet').evaluate("e=>e.classList.contains('open')"):page.click('#bMenu')
  if page.get_by_role('button',name='Search your space',exact=True).get_attribute('aria-expanded')=='false':page.get_by_role('button',name='Search your space',exact=True).click()
  page.get_by_role('searchbox',name='Search furniture, letters, scenes, ideas',exact=True).fill(q)
  assert page.locator('.space-search').bounding_box()['y']>page.locator('[aria-label="Menu sections"]').bounding_box()['y']
 open_home();assert body.get_by_role('heading',name='Control Centre',exact=True).is_visible();assert page.locator('#bHome').get_attribute('aria-label')=='Control Centre';assert view.locator('h2').all_text_contents()==['Tools and apps']
 assert view.locator('[data-app=rooms],[data-app=journal],[data-app=settings],[data-app=breathing]').count()==0
 assert view.locator('.today-tasks,.today-sky,.home-daily,.home-notifications,.home-coziness,.space-search').count()==0;assert view.locator('[data-app]').count()>20
 # Header settings replaces its app tile; native controls still affect the room.
 body.get_by_role('button',name='Open Settings',exact=True).click();assert page.locator('#menu-settings').is_visible()
 def control(label):return page.locator('#menu-settings').get_by_role('switch',name=re.compile('^'+re.escape(label)+r'(?:$| \()'))
 for value in [True,False]:
  b=control('Rain')
  if b.evaluate("e=>e.classList.contains('on')")!=value:b.click()
  assert page.evaluate('__lr.meta.weather')==('rain' if value else 'clear')
 page.keyboard.press('Escape');open_home();page.keyboard.press('Escape');assert page.locator('#bHome').evaluate('e=>document.activeElement===e')
 # The prominent search preserves all existing destinations and private content.
 search('HOME_PRIVATE');assert body.locator('.home-result-group h3').all_text_contents()==['Letters','Scenes','Ideas'];assert 'PRIVATE_SEALED_BODY' not in body.inner_text()
 body.get_by_role('button',name='HOME_PRIVATE_LETTER',exact=True).click();assert page.locator('#letterBody').inner_text()=='Private home letter body';assert 'open' not in page.locator('#sheet').get_attribute('class');page.click('#letterClose')
 search('HOME_PRIVATE_IDEA');body.get_by_role('button',name='HOME_PRIVATE_IDEA',exact=True).click();assert body.locator('h2').inner_text().startswith('The idea jar');assert 'HOME_PRIVATE_IDEA' in body.inner_text();page.keyboard.press('Escape')
 search('loft');body.get_by_role('button',name='Mezzanine loft bed',exact=True).click();assert page.evaluate('__lr.state.add')=='loft';assert page.locator('#tray .swatch').count()==1
 page.get_by_role('button',name='Show all',exact=True).click();assert page.locator('#tray .swatch').count()>1
 add_search=page.get_by_role('searchbox',name='Search furniture',exact=True);assert add_search.is_visible();assert add_search.bounding_box()['y']<page.locator('#row').bounding_box()['y']
 add_search.fill('SAUNA');assert page.locator('#row .swatch').count()==8;assert all(t.startswith('sauna-') for t in page.locator('#row .swatch').evaluate_all('es=>es.map(e=>e.dataset.furniture)'));assert add_search.evaluate('e=>document.activeElement===e')
 page.locator('#row .swatch').first.click();assert add_search.input_value()=='SAUNA';assert page.evaluate('__lr.state.add')=='sauna-benches'
 add_search.fill('nothingmatchesxyz');assert page.locator('#row .swatch').count()==0;assert 'No furniture found' in page.locator('#row').inner_text()
 add_search.fill('');assert page.locator('#row .swatch').count()>1
 page.evaluate('__lr.state.tool="paint";__lr.setMode("edit",true)');assert not add_search.is_visible();page.evaluate('__lr.setMode("explore",true)')
 page.evaluate('__lr.room.name="Changed since scene";__lr.changed()');search('HOME_PRIVATE_SCENE');body.get_by_role('button',name='HOME_PRIVATE_SCENE',exact=True).click();assert page.evaluate('__lr.room.name')=='Home room'
 page.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='phone').id)");body.get_by_role('button',name='Control Centre',exact=True).click();assert page.evaluate('__lr.home.active');assert 'open' in page.locator('#sheet').get_attribute('class');page.keyboard.press('Escape')
 # Tasks and weather live only in Your Space, with live state and persistence.
 search('');page.get_by_role('tab',name='Today',exact=True).click();assert body.locator('.today-sky').count()==1
 form=body.locator('.today-task-form');form.get_by_role('textbox',name='A little task',exact=True).fill('PRIVATE_SPACE_TASK');form.get_by_role('button',name='＋ Add',exact=True).click();body.get_by_role('checkbox',name='PRIVATE_SPACE_TASK',exact=True).check();page.keyboard.press('Escape');open_home();assert view.get_by_role('checkbox').count()==0;page.keyboard.press('Escape')
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});search('');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert body.get_by_role('checkbox',name='PRIVATE_SPACE_TASK',exact=True).is_checked();body.evaluate('e=>Promise.all(e.getAnimations().map(a=>a.finished))');page.screenshot(path=f'/tmp/space-search-{phase}-{width}.png');page.keyboard.press('Escape');open_home();assert view.evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/control-centre-{phase}-{width}.png');page.keyboard.press('Escape')
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');search('');page.get_by_role('tab',name='Today',exact=True).click();assert body.get_by_role('checkbox',name='PRIVATE_SPACE_TASK',exact=True).is_checked();page.keyboard.press('Escape')
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',code);assert 'HOME_PRIVATE' not in json.dumps(decoded);assert 'PRIVATE_SPACE_TASK' not in json.dumps(decoded)
 assert external==baseline,(baseline,external);assert not errors,errors
 print('PASS: prominent Your Space search, all four source routes, cross-group Add search and empty state, Control Centre tools only/header settings/toolbar/phone, exclusive persistent tasks and weather, responsive day/night/Escape, share privacy, no new network or console errors',flush=True)
 browser.close()
server.shutdown()
