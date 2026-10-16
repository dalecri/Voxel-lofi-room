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
 external=[];c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (external.append(r.request.url),r.abort())[-1]);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.todayUI');page.evaluate('''() => {const a=__lr;a.renderLoop.stop();window.effects={chime:0,sparkle:0,hop:0};for(const [object,key,label] of [[a.Sound,'chime','chime'],[a.view,'sparkle','sparkle'],[a.companion,'hop','hop']]){const original=object[key].bind(object);object[key]=(...args)=>{effects[label]++;return original(...args);};}}''')
 def menu():page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()
 menu();panel=page.locator('#menu-today');journey=panel.locator('.task-journey');assert journey.get_attribute('data-pose')=='idle';assert 'whenever' in journey.inner_text();assert panel.locator('.daily-heading').evaluate('h=>!!(h.compareDocumentPosition(document.querySelector(".today-tasks h3"))&Node.DOCUMENT_POSITION_FOLLOWING)');assert '·' in panel.locator('.daily-heading').inner_text()
 def add(text):panel.get_by_role('textbox',name='A little task',exact=True).fill(text);panel.get_by_role('button',name='＋ Add',exact=True).click()
 add('Wash my face');add('Walk outside');assert '2 little things left!' in journey.inner_text();assert panel.get_by_role('button',name='Icon for task: Wash my face',exact=True).inner_text()=='🧼';assert panel.get_by_role('button',name='Icon for task: Walk outside',exact=True).inner_text()=='👟';start=journey.locator('img').get_attribute('src');left=journey.locator('.task-journey-dude').evaluate('e=>parseFloat(getComputedStyle(e).left)')
 balance=page.evaluate('__lr.shop.balance');first=panel.get_by_role('checkbox',name='Wash my face',exact=True);first.check();assert first.is_checked();assert page.evaluate('__lr.shop.balance')==balance+3;assert first.locator('.task-check-reward').inner_text()=='+3';assert page.evaluate('effects')=={'chime':1,'sparkle':1,'hop':1};assert journey.get_attribute('data-remaining')=='1';assert journey.get_attribute('data-stage')=='afternoon';page.wait_for_function('old=>parseFloat(getComputedStyle(document.querySelector(".task-journey-dude")).left)>old',arg=left);assert first.evaluate('e=>document.activeElement===e')
 first.uncheck();assert page.evaluate('__lr.shop.balance')==balance+3;first.check();assert page.evaluate('__lr.shop.balance')==balance+3
 panel.get_by_role('checkbox',name='Walk outside',exact=True).check();assert 'All done. Rest now.' in journey.inner_text();assert journey.get_attribute('data-pose')=='sleep';assert journey.locator('img').get_attribute('src')!=start;assert journey.locator('.task-journey-zzz').is_visible();assert page.evaluate('__lr.shop.balance')==balance+6
 # Current costume layers feed the portrait; icon choices remain per-task.
 old=journey.locator('img').get_attribute('src');page.evaluate("__lr.wardrobe.equip('automata');__lr.companion.setSlots(__lr.wardrobe.slots);__lr.todayUI.refresh()");assert journey.locator('img').get_attribute('src')!=old
 icon=panel.get_by_role('button',name='Icon for task: Wash my face',exact=True);icon.click();panel.get_by_role('button',name='Use 🌙',exact=True).click();assert icon.inner_text()=='🌙';assert icon.evaluate('e=>document.activeElement===e')
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.todayUI');page.evaluate('__lr.renderLoop.stop()');menu();assert journey.get_attribute('data-pose')=='sleep';assert panel.get_by_role('button',name='Icon for task: Wash my face',exact=True).inner_text()=='🌙';balance=page.evaluate('__lr.shop.balance');first.uncheck();first.check();assert page.evaluate('__lr.shop.balance')==balance
 # A capped day celebrates completion without claiming an unearned +3.
 add('Call a friend');page.evaluate("for(let i=0;i<10;i++)__lr.shop.earn('moment')");assert page.evaluate('__lr.shop.earnedToday')==50;last=panel.get_by_role('checkbox',name='Call a friend',exact=True);balance=page.evaluate('__lr.shop.balance');last.check();assert page.evaluate('__lr.shop.balance')==balance;assert last.locator('.task-check-reward').inner_text()=='';assert journey.get_attribute('data-pose')=='sleep'
 for pose in ['sleep','idle']:
  if pose=='idle':last.uncheck()
  for phase in ['day','night']:
   page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
   for width in [320,390,1280]:
    page.set_viewport_size({'width':width,'height':844});panel.locator('.task-journey').scroll_into_view_if_needed();page.locator('#sheetBody').evaluate('e=>Promise.all(e.getAnimations().map(a=>a.finished))');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/little-things-{pose}-{phase}-{width}.png')
 page.emulate_media(reduced_motion='reduce');assert journey.locator('img').evaluate('e=>getComputedStyle(e).animationName')=='none';last.check();assert last.is_checked()
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert all(t not in raw for t in ['Wash my face','Walk outside','Call a friend','taskIds','todayTasks']);assert not external,external;assert not errors,errors
 print('PASS task keyword/custom icons, Fireflies once/reload/cap/no clawback, check/chime/sparkle/hop, current-outfit journey/sleep, heading hierarchy, keyboard focus, reduced motion, mobile/desktop day/night and private shares',flush=True);b.close()
server.shutdown()
