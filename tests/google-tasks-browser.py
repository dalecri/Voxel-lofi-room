"""npm run build && python tests/google-tasks-browser.py. Stubbed GIS + read-only Google APIs."""
import functools,json,re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);c=b.new_context(viewport={'width':390,'height':844},timezone_id='America/Toronto',reduced_motion='reduce')
 c.add_init_script("""const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[new D(2026,9,17,12).getTime()]))}static now(){return new D(2026,9,17,12).getTime()}};localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({sound:false,music:false,realtime:false,phase:'day',visitors:false,mischief:false,calmPerformance:true}));""")
 calls=[];status={'tasks':200,'events':200}
 def route(r):
  u=r.request.url
  if u.endswith('/calendar.js'):r.fulfill(content_type='application/javascript',body=re.sub(r"const GOOGLE_CLIENT_ID='[^']*';", "const GOOGLE_CLIENT_ID='fixture-client';", (ROOT/'www/calendar.js').read_text()))
  elif u.startswith('http://127.0.0.1:'):r.continue_()
  elif u=='https://accounts.google.com/gsi/client':
   calls.append(r.request);r.fulfill(content_type='application/javascript',body="window.google={accounts:{oauth2:{initTokenClient:o=>{window.authScope=o.scope;return {requestAccessToken:()=>o.callback({access_token:'TEST_GOOGLE_TOKEN',scope:o.scope,expires_in:3600})}},revoke:(token,cb)=>{window.revokedToken=token;cb()}}}};")
  elif u.startswith('https://tasks.googleapis.com/tasks/v1/'):
   calls.append(r.request)
   if '/users/@me/lists' in u:body={'items':[{'id':'work','title':'Work list'},{'id':'life','title':'Life list'}]};code=200
   else:
    code=status['tasks'];title='PRIVATE_WORK_TASK' if '/work/tasks' in u else 'PRIVATE_GOOGLE_TASK';body={'items':[{'id':'a','title':title,'notes':'PRIVATE_NOTES','due':'2026-10-18T00:00:00.000Z','status':'needsAction'},{'id':'b','title':'No due date','status':'needsAction'},{'id':'today','title':'PRIVATE_TODAY_TASK','due':'2026-10-17T00:00:00Z','status':'needsAction'},{'id':'overdue','title':'OVERDUE_NOT_SHOWN','due':'2026-10-16T00:00:00Z'},{'id':'later','title':'LATER_NOT_SHOWN','due':'2026-10-19T00:00:00Z'},{'id':'c','title':'COMPLETED_NOT_SHOWN','status':'completed'}]}
   if '/life/tasks' in u:body={'items':[]}
   r.fulfill(status=code,headers={'access-control-allow-origin':'*'},content_type='application/json',body=json.dumps(body))
  elif u.startswith('https://www.googleapis.com/calendar/v3/'):
   calls.append(r.request);r.fulfill(status=status['events'],headers={'access-control-allow-origin':'*'},content_type='application/json',body=json.dumps({'items':[{'id':'event','summary':'PRIVATE_GOOGLE_EVENT','start':{'date':'2026-10-18'},'end':{'date':'2026-10-19'}}]}))
  else:r.abort()
 c.route('**/*',route);page=c.new_page();errors=[];expected_auth_errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:(expected_auth_errors if m.text in ['Failed to load resource: the server responded with a status of 403 (Forbidden)','Failed to load resource: the server responded with a status of 401 (Unauthorized)'] else errors).append(m.text) if m.type=='error' else None);page.set_default_timeout(25000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.calendar');page.evaluate('__lr.renderLoop.stop()');assert not calls
 def today():page.click('#bMenu');page.get_by_role('tab',name='To-Do',exact=True).click()
 today();page.get_by_role('tab',name='Google',exact=True).click();section=page.locator('.google-tasks');assert section.evaluate('e=>e.parentElement.classList.contains("task-google-page")');assert page.locator('.today-sky .google-tasks').count()==0;assert section.get_by_role('button',name='Connect Google',exact=True).is_enabled();assert section.locator('.google-task-row').count()==0
 before=page.evaluate("localStorage.getItem('lr.todayTasks')");section.get_by_role('button',name='Connect Google',exact=True).click();section.get_by_text('PRIVATE_GOOGLE_TASK',exact=True).wait_for();assert section.locator('.google-task-row').count()==2;assert section.locator('[data-day=upcoming] .google-task-day-date').get_attribute('datetime')=='2026-10-18';assert section.locator('[role=checkbox]').count()==2;assert section.locator('[data-day=today] [data-task=today]').count()==1;assert section.locator('[data-day=upcoming] [data-task=a]').count()==1;assert section.get_by_text('No due date',exact=True).count()==0;assert section.get_by_text('OVERDUE_NOT_SHOWN',exact=True).count()==0;assert section.get_by_text('LATER_NOT_SHOWN',exact=True).count()==0;assert section.locator('.google-readonly').count()==0
 assert page.evaluate('authScope')=='https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly https://www.googleapis.com/auth/tasks';section.get_by_text('PRIVATE_GOOGLE_TASK',exact=True).click();assert page.evaluate("localStorage.getItem('lr.todayTasks')")==before
 picker=section.get_by_role('combobox',name='Google task list',exact=True);picker.select_option('work');section.get_by_text('PRIVATE_WORK_TASK',exact=True).wait_for();assert page.evaluate("JSON.parse(localStorage.getItem(LRCalendar.TOKEN)).listId")=='work'
 picker.select_option('life');section.get_by_text('Nothing scheduled for today.',exact=True).wait_for();section.get_by_text('Nothing scheduled for tomorrow.',exact=True).wait_for();assert section.locator('.google-task-row').count()==0;picker.select_option('work');section.get_by_text('PRIVATE_WORK_TASK',exact=True).wait_for()
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});section.scroll_into_view_if_needed();assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/google-tasks-{phase}-{width}.png')
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()');today();section.get_by_text('PRIVATE_WORK_TASK',exact=True).wait_for();assert picker.input_value()=='work';page.keyboard.press('Escape');page.evaluate('__lr.calendar.open()')
 board=page.locator('.calendar-view');due=board.locator('[data-date="2026-10-18"]');due.locator('.calendar-google-task').wait_for();due.locator('.calendar-google').wait_for();assert due.locator('.calendar-google').count()==1;assert due.locator('.calendar-google-task').inner_text()=='▢';due.click();page.get_by_role('heading',name='Google Tasks',exact=True).wait_for();assert 'PRIVATE_WORK_TASK' in page.locator('.calendar-remote').inner_text();assert 'PRIVATE_GOOGLE_EVENT' in page.locator('.calendar-remote').inner_text()
 # Disconnect from Today; both memory caches and calendar markers disappear.
 page.keyboard.press('Escape');today();section.get_by_role('button',name='Disconnect',exact=True).click();assert section.locator('.google-task-row').count()==0;page.wait_for_function("window.revokedToken==='TEST_GOOGLE_TOKEN'");assert page.evaluate('localStorage.getItem(LRCalendar.TOKEN)') is None
 page.keyboard.press('Escape');page.evaluate('__lr.calendar.open()');assert page.locator('.calendar-google,.calendar-google-task').count()==0;page.keyboard.press('Escape');today()
 # A Tasks API auth rejection clears the Calendar connection too.
 status['tasks']=403;section.get_by_role('button',name='Connect Google',exact=True).click();section.get_by_role('button',name='Reconnect Google',exact=True).wait_for();assert page.evaluate('localStorage.getItem(LRCalendar.TOKEN)') is None;assert not page.evaluate('__lr.googleCalendar.connected');assert section.locator('.google-task-row').count()==0
 status['tasks']=200;section.get_by_role('button',name='Reconnect Google',exact=True).click();section.get_by_text('PRIVATE_GOOGLE_TASK',exact=True).wait_for();page.keyboard.press('Escape');status['events']=401;page.evaluate('__lr.calendar.open()');page.get_by_role('button',name='Reconnect Google Calendar',exact=True).wait_for();assert page.locator('.calendar-google,.calendar-google-task').count()==0
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert all(x not in raw for x in ['PRIVATE_','TEST_GOOGLE_TOKEN','googleTasks','listId']);assert page.evaluate("localStorage.getItem('lr.todayTasks')")==before
 assert all(r.method=='GET' for r in calls);assert len(expected_auth_errors)==2,expected_auth_errors;assert not errors,errors
 print('PASS: combined GIS consent, Today task list/picker/reload, civil due dates, separate calendar markers/details, disconnect/revoke and cross-API reconnect clear both views, private shares/local tasks unchanged, mobile/desktop day/night',flush=True);b.close()
server.shutdown()
