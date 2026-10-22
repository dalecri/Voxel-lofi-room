"""npm run build && python3 tests/notebook-browser.py. Notebook: one Control Centre tile with Notes, Ideas, Whiteboard and Future me tabs; room furniture still opens each tool alone."""
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
 context.add_init_script("if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');}")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 page.click('#bHome');grid=page.locator('#homeView')
 assert grid.locator('[data-app=notebook]').count()==1
 for gone in ['typewriter','ideas','whiteboard','mailbox']:assert grid.locator(f'[data-app={gone}]').count()==0,gone
 grid.locator('[data-app=notebook]').click()
 tabs=page.locator('#sheetBody .notebook-tabs');assert tabs.is_visible();assert page.locator('#lettersView').is_visible()
 assert tabs.locator('[aria-current=page]').inner_text().strip().endswith('Notes');assert page.locator('#sheetBody .control-back').count()==1
 tabs.locator('[data-tab=ideas]').click();assert page.locator('.idea-jar,.roomtool').first.is_visible();assert page.locator('#sheetBody .notebook-tabs [aria-current=page]').get_attribute('data-tab')=='ideas'
 # Adding an idea redraws the tool; the tabs stay.
 page.evaluate("__lr.roomTools.addIdea ? __lr.roomTools.addIdea('A spark from the notebook') : null");page.evaluate("__lr.openNotebook('ideas')")
 assert page.locator('#sheetBody .notebook-tabs').count()==1
 page.locator('#sheetBody .notebook-tabs [data-tab=board]').click();assert page.locator('.whiteboard-panel').is_visible()
 page.locator('#sheetBody .notebook-tabs [data-tab=future]').click();assert page.locator('#sheetBody .notebook-tabs [aria-current=page]').get_attribute('data-tab')=='future'
 # Closing and reopening comes back to the last tab.
 page.keyboard.press('Escape');page.evaluate('__lr.openNotebook()');assert page.locator('#sheetBody .notebook-tabs [aria-current=page]').get_attribute('data-tab')=='future'
 # Room furniture opens its own tool, without the Notebook tabs.
 page.keyboard.press('Escape');page.evaluate("()=>{const a=__lr;const jar=a.room.add(a.room.make('ideajar',{x:2,z:2}));a.changed();a.interact(jar.id)}")
 page.wait_for_selector('.roomtool');assert page.locator('#sheetBody .notebook-tabs').count()==0
 page.keyboard.press('Escape');page.evaluate("__lr.cozy.whiteboard('room-board')")
 page.wait_for_selector('.whiteboard-panel');assert page.locator('#sheetBody .notebook-tabs').count()==0
 assert not errors,errors;print('PASS notebook: one tile, four tabs, last tab remembered, tabs survive redraws, furniture opens tools alone')
 browser.close()
