"""npm run build && python3 tests/task-journey-browser.py. Gentle checks and a local Firefly economy."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);c=b.new_context(viewport={'width':390,'height':844},timezone_id='America/Toronto')
 c.add_init_script("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({sound:false,music:false,realtime:false,phase:'day',visitors:false,mischief:false,calmPerformance:true}));if(localStorage.getItem('lr.fireflies')===null)localStorage.setItem('lr.fireflies','30')")
 external=[];c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (external.append(r.request.url),r.abort())[-1]);c.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}));page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.todayUI');page.evaluate('__lr.renderLoop.stop()')
 page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click();panel=page.locator('#menu-today')
 assert page.locator('.today-greeting').is_visible();assert page.locator('#sheetBody > h2').is_visible()
 assert page.locator('.today-greeting').evaluate('e=>e.compareDocumentPosition(document.querySelector(".dashboard-tabs"))&Node.DOCUMENT_POSITION_PRECEDING')
 for phase,greeting in [('morning','Good morning'),('day','Good afternoon'),('evening','Good evening'),('night','Good evening')]:
  page.evaluate('p=>{__lr.meta.phase=p;__lr.todayUI.refresh()}',phase);assert panel.locator('.today-sky').get_attribute('data-phase')==phase;assert greeting in page.locator('.today-greeting h2').inner_text();page.screenshot(path=f'/tmp/today-hero-{phase}.png')
 for tab in ['Rooms','Journal','Sound','Settings']:
  page.get_by_role('tab',name=tab,exact=True).click();assert page.locator('.today-greeting').is_hidden();assert page.locator('#sheetBody > h2').is_visible()
 page.get_by_role('tab',name='Today',exact=True).click()
 page.wait_for_function('document.querySelector(".french-today b")?.textContent.length>0');french=panel.locator('.french-today');before=page.evaluate('localStorage.getItem("lr.french.progress")');french.focus();page.keyboard.press('Enter');assert french.get_attribute('aria-pressed')=='true';assert french.locator('.french-example').is_visible();assert french.locator('.french-example').inner_text();page.keyboard.press('Space');assert french.get_attribute('aria-pressed')=='false';assert page.evaluate('localStorage.getItem("lr.french.progress")')==before
 got=panel.locator('.today-got');got.click();assert got.is_disabled();assert page.evaluate('__lr.dailyInfo().D.done');assert 'day streak' in panel.locator('.today-streak').inner_text()
 panel.get_by_role('textbox',name='A little task',exact=True).fill('Wash dishes');panel.get_by_role('button',name='＋ Add',exact=True).click();assert panel.locator('.task-counter').inner_text()=='0 of 1';panel.get_by_role('checkbox',name='Wash dishes').check();assert panel.locator('.task-counter').inner_text()=='1 of 1';assert panel.get_by_role('progressbar').get_attribute('aria-valuenow')=='100'
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':900});page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/today-layout-{width}.png',full_page=True)
  boxes=panel.locator('.today-duo > *').evaluate_all('es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y}))');assert (boxes[0]['y']==boxes[1]['y'])==(width>=360)
 for id,selector in [('tea','.tea-dial'),('garden','.focus-garden'),('letter','#lettersView'),('ideas','.idea-stack')]:
  panel.locator(f'[data-ritual="{id}"]').click();assert page.locator(selector).is_visible(),id;page.keyboard.press('Escape');page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()
 page.evaluate("() => {const a=__lr;a.roomTools.brew(2);a.letters.model.add('Test room');a.letters.model.update({body:'A small letter',letterhead:'Test'});a.roomTools.addIdea('A spark');a.todayUI.refresh();}");assert 'brewing' in panel.locator('[data-ritual=tea] small').inner_text();assert panel.locator('[data-ritual=letter] small').inner_text()=='draft';assert panel.locator('[data-ritual=ideas] small').inner_text()=='1 spark'
 assert not errors,errors
 print('PASS Today greeting/tab isolation, phase heroes, French keyboard flip, daily claim, notebook progress, ritual destinations and responsive layout');b.close()
server.shutdown()
