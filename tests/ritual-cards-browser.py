"""npm run build && python3 tests/ritual-cards-browser.py. Today cards retain real actions and live state."""
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
 context=browser.new_context(viewport={'width':390,'height':844})
 context.add_init_script("localStorage.setItem('lr.intro','true')")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 page.evaluate("__lr.room.items=[];__lr.meta.visitors=false;__lr.setMode('explore',true);__lr.changed()")
 def menu():
  page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()
 menu();assert page.locator('.ritual-cards button.d.today').count()==3
 assert page.locator('.ritual-cards b').all_text_contents()==['Breathing room','Wardrobe','Traveling merchant']
 assert page.locator('#bBreathing [data-ritual-state]').inner_text()=='10 minutes · not started'
 assert page.locator('#bWardrobe [data-ritual-state]').inner_text().startswith('Wearing ')
 assert 'out wandering' in page.locator('#bShop').inner_text();assert page.locator('#menu-today > .today').count()==1
 page.locator('#bBreathing').focus();page.evaluate("window.__card=document.querySelector('#bBreathing');__lr.rituals.startBreathing()")
 page.wait_for_function("document.querySelector('#bBreathing [data-ritual-state]').textContent.includes('minutes left')")
 assert page.evaluate("document.activeElement===__card && document.querySelector('#bBreathing')===__card")
 page.evaluate('__lr.rituals.stopBreathing()');page.wait_for_function("document.querySelector('#bBreathing [data-ritual-state]').textContent==='10 minutes · not started'")
 old=page.evaluate('__lr.shop.balance');page.evaluate("__lr.shop.earn('moment','ritual-card-live-balance')");page.wait_for_function("n=>document.querySelector('#bShop [data-ritual-state]').textContent.startsWith(n+' Fireflies')",arg=old+5)
 page.click('#bBreathing');assert page.locator('#breathStart').is_visible();page.click('#breathNotNow');menu()
 page.click('#bWardrobe');page.get_by_role('button',name='Wear Automata',exact=True).click();page.keyboard.press('Escape');menu();assert page.locator('#bWardrobe [data-ritual-state]').inner_text()=='Wearing Automata'
 page.click('#bShop');assert 'Mallow’s traveling treasures' in page.locator('#sheetBody').inner_text();page.click('#shopClose')
 page.evaluate('__lr.meta.visitors=true;__lr.merchant.tick(1000,true,1);__lr.tickWorld(0)');menu();assert 'visiting your room' in page.locator('#bShop').inner_text()
 page.evaluate('__lr.meta.visitors=false');page.wait_for_function("document.querySelector('#bShop [data-ritual-state]').textContent.includes('out wandering')")
 for phase in ['day','night']:
  page.evaluate('p=>__lr.setPhase(p,true)',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert page.locator('.ritual-cards').evaluate('e=>e.scrollWidth<=e.clientWidth');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.screenshot(path=f'/tmp/ritual-cards-{phase}-{width}.png')
 page.keyboard.press('Escape');assert 'open' not in page.locator('#sheet').get_attribute('class');assert not errors,errors
 print('PASS: three daily-style Rituals cards, existing actions, live breathing/outfit/balance/merchant states, stable focus, responsive day/night layouts, Escape and no JS errors',flush=True)
 browser.close()
server.shutdown()
