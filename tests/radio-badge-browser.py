"""npm run build && python3 tests/radio-badge-browser.py. Journal without duplicate daily controls and miniature radio controls."""
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
 context.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','exportedAt':'','clips':[]}))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 assert page.evaluate('__lr.meta.current')==101;assert page.evaluate('JSON.parse(localStorage.getItem("lr.room.102")).name')=='Living draft restored'
 menu('Today');assert page.locator('#menu-today .daily-notice').count()==0;assert page.locator('#menu-today .today-got').count()==0
 page.get_by_role('tab',name='To-Do',exact=True).click();assert page.locator('#menu-todo .daily-notice,#menu-todo .journal-streak').count()==0;esc();page.click('#disc');assert page.locator('#bMomentDiary').is_visible();assert page.locator('#bCatDiary').is_visible();esc()
 def set_icon(name,icon):
  page.get_by_role('button',name='Edit icon for '+name,exact=True).click();page.get_by_role('button',name='Use '+icon+' for '+name,exact=True).click()
 page.evaluate("HTMLMediaElement.prototype.play=function(){return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){}")
 # The library lists real stations, with one playback engine and explicit editing.
 menu('Sound');library=page.locator('.radio-library');assert library.get_by_role('heading',name='My Radio',exact=True).is_visible();assert page.locator('.station-card').count()==0;assert library.locator('.radio-library-row').count()==2
 assert not page.locator('.station-browser').is_visible();assert not page.locator('#stName').is_visible()
 library.get_by_role('button',name='Play Lofi radio',exact=True).click();assert page.evaluate('__lr.meta.music && __lr.meta.station===0');assert library.get_by_role('button',name='Pause radio',exact=True).is_visible()
 library.get_by_role('button',name='Next station',exact=True).click();assert page.evaluate('__lr.meta.station')==1;assert library.locator('.radio-library-row.is-playing b').inner_text()=='Old station'
 library.get_by_role('button',name='Next station',exact=True).click();assert page.evaluate('__lr.meta.station')==0;library.get_by_role('button',name='Previous station',exact=True).click();assert page.evaluate('__lr.meta.station')==1
 library.get_by_role('button',name='Pause radio',exact=True).click();assert not page.evaluate('__lr.meta.music')
 set_icon('Old station','🌙');assert page.evaluate('__lr.meta.stations[0].icon')=='🌙';set_icon('Lofi radio','🌿');assert page.evaluate('__lr.meta.lofiIcon')=='🌿'
 search=library.get_by_role('searchbox',name='Find a station',exact=True);search.fill('old');assert library.locator('.radio-library-row:visible').count()==1;search.fill('nothingmatches');assert library.locator('.radio-library-empty').is_visible();search.fill('')
 browse=page.get_by_role('button',name='Browse stations',exact=True);browse.click();assert page.locator('.station-browser').is_visible();browse.click();assert not page.locator('.station-browser').is_visible()
 add=page.get_by_role('button',name='Add station',exact=True);add.click();assert page.locator('.station-add-disclosure').bounding_box()['y']<library.locator('.radio-library-list').bounding_box()['y'];page.locator('#stName').fill('Night garden');page.locator('#stUrl').fill('https://example.com/night.mp3');page.locator('#stUrl').press('Enter');assert library.locator('.radio-library-row').count()==3;assert page.locator('#stName').is_hidden();assert page.locator('.station-add-toggle').evaluate('e=>e===document.activeElement');assert not page.evaluate('__lr.meta.music')
 library.get_by_role('button',name='Play Night garden',exact=True).click();assert page.evaluate('__lr.meta.station')==2;library.get_by_role('button',name='Remove Night garden',exact=True).click();assert library.locator('.radio-library-row').count()==2;assert not page.evaluate('__lr.meta.music')
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');assert library.locator('.radio-library-toolbar').evaluate('e=>e.scrollWidth<=e.clientWidth');assert library.locator('.radio-library-toolbar button').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})');page.screenshot(path=f'/tmp/my-radio-{phase}-{width}.png')
   add.click();assert page.locator('#stName').is_visible();assert page.locator('.addstation').evaluate('e=>e.scrollWidth<=e.clientWidth');browse.click();assert page.locator('#stName').is_hidden();assert page.locator('.station-browser').is_visible();browse.click()
 esc();page.reload(wait_until='networkidle');ready();menu('Sound');assert page.evaluate('__lr.meta.stations[0].icon')=='🌙';assert page.evaluate('__lr.meta.lofiIcon')=='🌿';assert not page.locator('.station-browser').is_visible();assert not page.locator('#stName').is_visible()
 assert not errors,errors
 print('PASS My Radio header/library, play/pause, previous/next wrapping, direct station playback, icon editing/persistence, add/remove, search, folded browse/add, mobile/desktop themes and no console errors',flush=True);browser.close()
server.shutdown()
