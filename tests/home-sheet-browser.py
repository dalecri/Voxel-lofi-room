"""Build www first. Home: one sheet with Today / Lane / Tools tabs, Settings behind the gear, a calm top bar."""
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
 # Top bar: only Undo and Home show; Lane, Menu, Settings and the time chip live inside Home now.
 assert page.locator('header .chips > button:visible').evaluate_all('es=>es.map(e=>e.id)')==['bUndo','bHome']
 assert page.locator('#bTime').is_hidden() and page.locator('#disc').is_hidden()
 assert page.locator('.explorebar > button').evaluate_all('es=>es.map(e=>e.id)')==['bSurprise','bEdit','bShare']
 # Home opens on Today with the shared header and three tabs.
 page.click('#bHome');assert body.get_attribute('data-hub')=='today';assert page.locator('#bHome').get_attribute('aria-expanded')=='true'
 tabs=body.locator('.hub-tabs [role=tab]');assert tabs.evaluate_all('es=>es.map(e=>e.textContent)')==['Today','Lane','Tools']
 assert body.locator('#hub-tab-today').get_attribute('aria-selected')=='true';assert body.locator('.hub-title').inner_text().endswith('afternoon')
 assert body.locator('.menu-nav,.app-sheet-heading,.home-sheet-actions').count()==0
 assert body.locator('.hub-pin').evaluate_all('es=>es.map(e=>e.dataset.pin)')==['todo','habits','mood','sound']
 assert body.locator('.hub-row small').inner_text().endswith('of 76') or ' of ' in body.locator('.hub-row small').inner_text()
 # Tapping Home again keeps the sheet where it is.
 page.evaluate("document.getElementById('bHome').click()");assert body.get_attribute('data-hub')=='today'
 # Lane: finds, errands and the walk share one card; the place cards lose their hints.
 page.click('#hub-tab-lane');assert body.get_attribute('data-hub')=='lane';assert body.locator('.lane').is_visible()
 assert body.locator('.hub-card .lane-walk').count()==1;assert body.locator('.lane-intro').is_hidden();assert body.get_by_role('heading',name='The Lane',exact=True).count()==0
 # Tools: grouped shelves; searching flattens them.
 page.click('#hub-tab-tools');assert page.evaluate('__lr.home.active');assert body.get_attribute('data-hub')=='tools'
 shelves=body.locator('.home-group-title').evaluate_all('es=>es.map(e=>e.textContent)');assert shelves[:4]==['Write','Track','Unwind','Make'],shelves
 assert body.locator('#homeView [data-app]').count()>20;assert body.locator('#homeView .home-app small:visible').count()==0
 # The sheet remembers the last tab.
 page.keyboard.press('Escape');assert body.get_attribute('data-hub') is None;page.click('#bHome');assert body.get_attribute('data-hub')=='tools'
 # Settings: gear, a Time group at the top, Back returns to the last tab.
 body.get_by_role('button',name='Settings',exact=True).click();assert body.get_attribute('data-hub')=='settings'
 assert body.locator('.settings-group-title').first.inner_text().lower()=='time'
 assert body.locator('#menu-settings .toggle:not(.settings-action) small:visible').count()==0
 body.locator('.settings-time [data-phase=evening]').click();assert page.evaluate('__lr.meta.phase')=='evening';assert not page.evaluate('__lr.meta.realtime')
 assert body.locator('.settings-time [data-phase=evening]').get_attribute('aria-checked')=='true'
 body.get_by_role('button',name='Back',exact=True).click();assert body.get_attribute('data-hub')=='tools'
 # No sideways scroll anywhere, day or night.
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   for tab in ['today','lane','tools']:
    page.click('#hub-tab-'+tab);assert body.evaluate('e=>e.scrollWidth<=e.clientWidth'),(phase,width,tab);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.keyboard.press('Escape');assert page.locator('#bHome').evaluate('e=>e===document.activeElement')
 assert not errors,errors
 print('PASS home sheet: calm top bar, Today/Lane/Tools tabs, remembered tab, grouped tools, settings with time, no overflow',flush=True)
 browser.close()
server.shutdown()
