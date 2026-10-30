"""npm run build && python3 tests/settings-button-browser.py. Settings has its own gear in the top-right toolbar:
it opens the menu straight on Settings, closes like any sheet, works with the ',' key, and fits on small phones."""
import functools
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
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');context.add_init_script("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.menuTab',JSON.stringify('Today'))")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 def close():page.keyboard.press('Escape');page.wait_for_function("!document.querySelector('#sheet').classList.contains('open')")
 gear=page.get_by_role('button',name='Settings',exact=True).first
 # It sits at the right end of the top-right toolbar.
 assert page.evaluate("[...document.querySelectorAll('header .chips .chip')].filter(b=>b.offsetParent).at(-1).id")=='bSettings'
 gear.click();page.locator('#menu-settings').wait_for(state='visible')
 assert page.locator('#sheet').get_attribute('class').count('open') and gear.get_attribute('aria-expanded')=='true'
 close();assert gear.get_attribute('aria-expanded')=='false'
 # The Menu button still opens where you left off; the gear always lands on Settings.
 page.click('#bMenu');page.locator('#menu-settings').wait_for(state='visible');close()
 page.evaluate("localStorage.setItem('lr.menuTab',JSON.stringify('Today'))");page.click('#bMenu');page.locator('#menu-today').wait_for(state='visible');close()
 gear.click();page.locator('#menu-settings').wait_for(state='visible');close()
 page.keyboard.press(',');page.locator('#menu-settings').wait_for(state='visible');close()
 # Fits on small phones and desktop: the toolbar stays on screen and nothing overlaps the room name.
 for w in [320,360,390,1280]:
  page.set_viewport_size({'width':w,'height':800});page.wait_for_timeout(200)
  box=gear.bounding_box();brand=page.locator('header .brand').bounding_box()
  assert box and box['x']+box['width']<=w and box['x']>=0,(w,box)
  assert brand['x']+brand['width']<=page.locator('header .chips').bounding_box()['x']+1,(w,'brand overlaps the toolbar')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),w
 assert not errors,errors
 print('PASS settings button: top-right gear opens Settings directly, closes cleanly, "," shortcut, Menu keeps its tab, fits 320 to 1280')
 browser.close();server.shutdown()
