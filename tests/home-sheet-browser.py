"""Build www first. Home: a bottom dock (Today, Lane, Decorate, Tools, You) switching one sheet, and a calm top bar."""
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
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script("if(!localStorage.getItem('hubFixture')){localStorage.setItem('hubFixture','1');localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({phase:'day',realtime:false,visitors:false,mischief:false,calmPerformance:true}));}")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');page.evaluate('__lr.renderLoop.stop()')
 body=page.locator('#sheetBody')
 dock=page.locator('.dock');cur="document.querySelector('.dock-tab[aria-current=page]')?.dataset.hubTab||''"
 # Top bar: Undo, Surprise, Photo; Lane, Menu, Settings and the time chip live behind the dock now.
 assert page.locator('header .chips > button:visible').evaluate_all('es=>es.map(e=>e.id)')==['bUndo','bSurprise','bShare']
 assert page.locator('#bTime').is_hidden() and page.locator('#disc').is_hidden()
 # Dock: four tabs with Decorate raised in the middle.
 assert dock.locator('> button').evaluate_all('es=>es.map(e=>e.id)')==['hub-tab-today','hub-tab-lane','bEdit','hub-tab-tools','hub-tab-you']
 assert dock.locator('.dock-tab').evaluate_all('es=>es.map(e=>e.textContent)')==['Today','Lane','Tools','You'];assert page.evaluate(cur)==''
 # Today: shared header, lane card, pins, cozy moments; the dock marks the tab.
 page.click('#hub-tab-today');assert body.get_attribute('data-hub')=='today';assert page.evaluate(cur)=='today'
 assert body.locator('.hub-title').inner_text().endswith('afternoon');assert body.locator('.hub-tabs,.hub-settings,.menu-nav,.app-sheet-heading,.home-sheet-actions').count()==0
 assert body.locator('.hub-pin').evaluate_all('es=>es.map(e=>e.dataset.pin)')==['todo','habits','mood','sound']
 assert ' of ' in body.locator('.hub-row small').inner_text()
 # The dock stays tappable above Home, and its last row of content clears it.
 assert dock.is_visible() and dock.evaluate('e=>getComputedStyle(e).pointerEvents')!='none'
 # Tapping the tab that's showing leaves it.
 page.click('#hub-tab-today');assert body.get_attribute('data-hub')=='today'
 # Lane: one card for the day, the places drawn as a single four-across street.
 page.click('#hub-tab-lane');assert body.get_attribute('data-hub')=='lane';assert page.evaluate(cur)=='lane'
 assert body.locator('.hub-card .lane-walk').count()==1;assert body.locator('.lane-intro').is_hidden()
 tops=body.locator('.lane-street .lane-front').evaluate_all('es=>es.map(e=>Math.round(e.getBoundingClientRect().top))');assert len(tops)==4 and len(set(tops))==1,tops
 # Tools: grouped shelves.
 page.click('#hub-tab-tools');assert page.evaluate('__lr.home.active');assert body.get_attribute('data-hub')=='tools';assert page.evaluate(cur)=='tools'
 shelves=body.locator('.home-group-title').evaluate_all('es=>es.map(e=>e.textContent)');assert shelves[:4]==['Write','Track','Unwind','Make'],shelves
 assert body.locator('#homeView [data-app]').count()>20;assert body.locator('#homeView .home-app small:visible').count()==0
 # Any other sheet (a tool) covers the dock; closing returns focus to the dock.
 body.locator('#homeView [data-app=tea]').click();page.wait_for_timeout(400);assert body.get_attribute('data-hub') is None;assert dock.evaluate('e=>getComputedStyle(e).pointerEvents')=='none'
 page.keyboard.press('Escape');page.wait_for_timeout(400);assert page.evaluate('document.activeElement.classList.contains("dock-tab")')
 # You: Settings with time first and every switch as a tile.
 page.click('#hub-tab-you');assert body.get_attribute('data-hub')=='settings';assert page.evaluate(cur)=='you'
 assert body.locator('.settings-group-title').first.inner_text().lower()=='time'
 assert body.locator('#menu-settings .toggle:not(.settings-action) small:visible, #menu-settings .toggle:not(.settings-action) i:visible').count()==0
 music=body.get_by_role('switch',name='Music',exact=False).first;was=music.get_attribute('aria-checked');music.click();assert body.get_by_role('switch',name='Music',exact=False).first.get_attribute('aria-checked')!=was
 body.locator('.settings-time [data-phase=evening]').click();assert page.evaluate('__lr.meta.phase')=='evening';assert not page.evaluate('__lr.meta.realtime')
 assert body.locator('.settings-time [data-phase=evening]').get_attribute('aria-checked')=='true'
 # Close, then the dock reopens the last Home tab you picked.
 page.keyboard.press('Escape');page.wait_for_timeout(400);assert page.evaluate(cur)=='';page.click('#hub-tab-lane');assert body.get_attribute('data-hub')=='lane'
 # No sideways scroll anywhere, day or night.
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   for tab in ['today','lane','tools','you']:
    page.click('#hub-tab-'+tab);assert body.evaluate('e=>e.scrollWidth<=e.clientWidth'),(phase,width,tab);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('PASS home dock: top bar, dock tabs over Home, drawn street, grouped tools, settings tiles with time, focus return, no overflow',flush=True)
 browser.close()
server.shutdown()
