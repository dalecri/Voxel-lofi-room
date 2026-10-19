"""npm run build && python3 tests/task-notebook-browser.py. Optional starter goals and a cozy paper list."""
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
 def menu():page.click('#bMenu');page.get_by_role('tab',name='To-Do',exact=True).click()
 menu();page.get_by_role('tab',name='To-Do',exact=True).click();panel=page.locator('#menu-todo');starters=panel.locator('.task-starters');notebook=panel.locator('.task-notebook');assert page.evaluate('__lr.todayTasks.list().length')==0;assert starters.get_attribute('open') is not None;assert starters.locator('.task-starter').count()==7
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');notebook.screenshot(path=f'/tmp/task-starter-plan-{phase}-{width}.png')
 balance=page.evaluate('__lr.shop.balance');starters.get_by_role('button',name='Add Wash my face',exact=True).click();assert page.evaluate('__lr.todayTasks.list().length')==1;assert panel.get_by_role('checkbox',name='Wash my face',exact=True).is_visible();assert page.evaluate('__lr.shop.balance')==balance;assert starters.locator('.task-starter').count()==6
 starters.get_by_role('button',name='Add 6 little things',exact=True).click();assert page.evaluate('__lr.todayTasks.list().length')==7;assert not starters.is_visible();assert panel.get_by_role('checkbox').count()==7;assert page.evaluate('__lr.shop.balance')==balance
 first=panel.get_by_role('checkbox',name='Brush teeth',exact=True);first.check();assert page.evaluate('__lr.shop.balance')==balance+3;assert first.locator('svg').get_attribute('stroke-width')=='2.2';first.uncheck();first.check();assert page.evaluate('__lr.shop.balance')==balance+3
 panel.get_by_role('textbox',name='A little task',exact=True).fill('MY_PRIVATE_NOTEBOOK_TASK');panel.get_by_role('button',name='＋ Add',exact=True).click();assert panel.get_by_role('checkbox').count()==8
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');notebook.screenshot(path=f'/tmp/task-notebook-filled-{width}.png')
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.todayUI');page.evaluate('__lr.renderLoop.stop()');menu();assert panel.get_by_role('checkbox').count()==8;assert panel.get_by_role('checkbox',name='Brush teeth',exact=True).is_checked();assert not starters.is_visible();assert panel.get_by_role('button',name='Icon for task: Take a stretch break',exact=True).inner_text()=='🦒';assert panel.get_by_role('button',name='Icon for task: Do one thing that makes me happy',exact=True).inner_text()=='😊'
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'MY_PRIVATE_NOTEBOOK_TASK' not in raw;assert 'todayTasks' not in raw;assert not external,external;assert not errors,errors
 print('PASS optional seven-goal starter plan, individual/bulk add without rewards, paper-list layouts, check rewards exactly once, SVG check, custom tasks, reload/icons and private shares at mobile/desktop widths',flush=True);b.close()
server.shutdown()
