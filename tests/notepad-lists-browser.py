"""npm run build && python3 tests/notepad-lists-browser.py — compact paper lists and existing actions."""
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
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script('''localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({sound:false,music:false,realtime:false,phase:'day',visitors:false,calmPerformance:true}));''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());context.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.todayUI');page.evaluate('__lr.renderLoop.stop()')
 def menu():page.click('#bMenu');page.get_by_role('tab',name='To-Do',exact=True).click()
 def fit():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();menu();tasks=page.locator('.task-notebook')
 for text in ['Take daily supplements','Scoop cat litter','Daily home chore','Workout','One important thing']:
  page.get_by_role('textbox',name='A little task',exact=True).fill(text);page.get_by_role('button',name='＋ Add',exact=True).click()
 first=page.get_by_role('checkbox',name='Take daily supplements',exact=True);first.focus();page.keyboard.press('Space');assert first.is_checked();assert tasks.locator('.task-counter').inner_text()=='1 of 6'
 # Checkboxes precede their text; rows use a shared vellum surface and the companion/form stay in the paper.
 assert tasks.locator('.today-task').first.evaluate('e=>e.querySelector(".today-task-check").getBoundingClientRect().right<=e.querySelector(".today-task-text").getBoundingClientRect().left')
 assert tasks.locator('.task-journey').count()==1;assert tasks.locator('.today-task-form').count()==1
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});fit();assert tasks.locator('.today-task-list').evaluate('e=>getComputedStyle(e).gap')=='8px';assert tasks.locator('.task-checkmark').first.evaluate('e=>getComputedStyle(e).width')=='26px';tasks.screenshot(path=f'/tmp/notepad-todo-{phase}-{width}.png')
 page.get_by_role('button',name='Icon for task: Workout',exact=True).click();page.get_by_role('button',name='Use 🌙',exact=True).click();assert page.get_by_role('button',name='Icon for task: Workout',exact=True).inner_text()=='🌙'
 page.get_by_role('button',name='Remove task: One important thing',exact=True).click();assert tasks.locator('.today-task').count()==5
 page.keyboard.press('Escape');page.evaluate("__lr.roomToolsUI.open('groceries')");groceries=page.locator('.grocery-notebook')
 for text in ['Milk','Eggs','Bread','Apples','Tea']:
  page.get_by_role('textbox',name='Add groceries',exact=True).fill(text);page.get_by_role('button',name='Add to list',exact=True).click()
 page.get_by_role('checkbox',name='Milk',exact=True).check();assert page.get_by_role('checkbox',name='Milk',exact=True).is_checked()
 assert groceries.locator('.grocery-row').first.evaluate('e=>e.querySelector(".grocery-check").getBoundingClientRect().right<=e.querySelector(".grocery-name").getBoundingClientRect().left');assert groceries.locator('.grocery-add').count()==1
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});fit();assert groceries.locator('.grocery-check').first.evaluate('e=>getComputedStyle(e).width')=='28px';assert groceries.locator('.grocery-check').first.evaluate('e=>getComputedStyle(e).borderRadius')=='50%';assert groceries.locator('.grocery-row.done .grocery-name').first.evaluate('e=>getComputedStyle(e).textDecorationLine').startswith('line-through');assert groceries.locator('.grocery-summary').is_visible();groceries.screenshot(path=f'/tmp/notepad-groceries-{phase}-{width}.png')
 assert groceries.locator('.grocery-row').first.evaluate('e=>getComputedStyle(e).animationName')=='none'
 assert groceries.locator('.grocery-row:not(.done) .grocery-name').first.evaluate('e=>getComputedStyle(e).color===getComputedStyle(e.closest(".grocery-notebook")).color')
 media=context.new_cdp_session(page);media.send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'},{'name':'prefers-reduced-transparency','value':'reduce'}]});assert groceries.locator('.grocery-row').first.evaluate('e=>getComputedStyle(e).backdropFilter')=='none'
 page.get_by_role('button',name='Remove grocery: Apples',exact=True).click();assert page.get_by_role('checkbox',name='Apples',exact=True).count()==0;page.get_by_role('button',name='Clear checked items',exact=True).click();assert page.get_by_role('checkbox',name='Milk',exact=True).count()==0
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');ready();menu();assert page.get_by_role('checkbox',name='Take daily supplements',exact=True).is_checked();page.keyboard.press('Escape');page.evaluate("__lr.roomToolsUI.open('groceries')");assert page.get_by_role('checkbox').count()==3;assert not errors,errors
 print('PASS vellum To-Do and grocery lists, left checks, keyboard check, add/delete/clear, icon editing, reload persistence, 320/390/1280 day/night, no console errors',flush=True);browser.close()
server.shutdown()
