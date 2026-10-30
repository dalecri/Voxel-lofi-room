"""npm run build && python3 tests/games-browser.py. HTML games open the in-app Game library; each cartridge links straight to its game."""
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
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script("if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');}window.__opened=[];window.open=(...a)=>{window.__opened.push(a[0]);return null;};")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(body='<title>game</title>',content_type='text/html'))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 # Control Centre: HTML games opens the library, not the collection page.
 page.click('#bHome');tile=page.locator('#homeView [data-app="portal:https://heycristobal.com/my-collection/"]');assert tile.count()==1;tile.click()
 lib=page.locator('.games-library');assert lib.is_visible();assert page.evaluate('window.__opened')==[];assert page.locator('#sheetBody').get_attribute('data-tool')=='games'
 assert page.locator('#sheetBody .control-back').count()==1
 cart=lib.locator('a.games-cart[data-game="gnomeboy"]');assert cart.count()==1
 assert cart.get_attribute('href')=='https://heycristobal.com/gnomeboy/' and cart.get_attribute('target')=='_blank' and cart.get_attribute('rel')=='noopener noreferrer'
 assert 'Gnomeboy' in cart.inner_text() and cart.get_attribute('aria-label')=='Play Gnomeboy (opens in a new tab)'
 assert lib.locator('a.games-cart').count()==9
 for a in lib.locator('a.games-cart').all():assert a.get_attribute('href').startswith('https://') and a.get_attribute('target')=='_blank' and a.get_attribute('rel')=='noopener noreferrer'
 assert lib.locator('a.games-cart[data-game="lastlight"]').get_attribute('href')=='https://dalecri.github.io/lastlight/lastlight.html'
 assert lib.locator('.games-all').get_attribute('href')=='https://heycristobal.com/my-collection/'
 with context.expect_page() as opened:cart.click()
 tab=opened.value;tab.wait_for_load_state();assert tab.url=='https://heycristobal.com/gnomeboy/';assert tab.evaluate('window.opener===null');tab.close()
 # The App launcher sends HTML games to the library too.
 page.evaluate('__lr.dashboard.launcher()');page.locator('.launcher-tile',has_text='HTML games').first.click();assert page.locator('.games-library').is_visible();assert page.evaluate('window.__opened')==[]
 # Retired built-in portals are not listed alongside the game library.
 page.evaluate('__lr.dashboard.launcher()');assert page.locator('.launcher-tile',has_text='Voxel Worlds').count()==0;assert page.evaluate('window.__opened')==[]
 assert not errors,errors;print('PASS game library: Control Centre and launcher open it, nine cartridges link directly in an isolated tab, retired portals absent')
 browser.close()
