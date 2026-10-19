"""Build www first. All Google reads/writes are fixtures; never touches live tasks."""
import functools,json,re
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
 c=browser.new_context(viewport={'width':390,'height':1000},reduced_motion='reduce',timezone_id='America/Toronto')
 c.add_init_script('''if(!localStorage.getItem('checksFixture')){localStorage.setItem('checksFixture','true');const r={v:1,name:'Task room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true},'lr.googleCalendarToken':{access_token:'OLD_TOKEN',scope:'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly',expiresAt:Date.now()+3600000,listId:'@default'}}))localStorage.setItem(k,JSON.stringify(v));}''')
 tasks={'@default':[{'id':'a','title':'PRIVATE_TASK_A','due':'2026-10-18T00:00:00.000Z','status':'needsAction'},{'id':'b','title':'PRIVATE_TASK_B','status':'needsAction'}],'work':[{'id':'w','title':'PRIVATE_WORK','status':'needsAction'}]};writes=[];failure={'on':False}
 def route(r):
  u=r.request.url
  if u.endswith('/calendar.js'):r.fulfill(content_type='application/javascript',body=re.sub(r"const GOOGLE_CLIENT_ID='[^']*';","const GOOGLE_CLIENT_ID='fixture';",(ROOT/'www/calendar.js').read_text()))
  elif u.startswith('http://127.0.0.1:'):r.continue_()
  elif u=='https://accounts.google.com/gsi/client':r.fulfill(content_type='application/javascript',body="window.google={accounts:{oauth2:{initTokenClient:o=>{window.grant=o;return {requestAccessToken:()=>o.callback({access_token:'NEW_TOKEN',scope:o.scope,expires_in:3600})}},revoke:(t,cb)=>cb()}}}")
  elif u.startswith('https://tasks.googleapis.com/tasks/v1/'):
   if '/users/@me/lists' in u:r.fulfill(json={'items':[{'id':'home','title':'Home'},{'id':'work','title':'Work'}]});return
   part=u.split('/lists/')[1].split('/');listid=part[0].replace('%40','@');items=tasks[listid]
   if r.request.method=='PATCH':
    body=r.request.post_data_json;writes.append((listid,part[2],body))
    if failure['on']:r.fulfill(status=503,json={'error':'fixture offline'});return
    task=next(t for t in items if t['id']==part[2]);task.update(body);r.fulfill(json=task)
   else:r.fulfill(json={'items':[t for t in items if t['status']=='needsAction']})
  else:r.abort()
 c.route('**/*',route);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '503' not in m.text else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()');page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click();page.get_by_role('tab',name='Google',exact=True).click()
 section=page.locator('.google-tasks');a=lambda:section.get_by_role('checkbox',name='PRIVATE_TASK_A',exact=True);b=lambda:section.get_by_role('checkbox',name='PRIVATE_TASK_B',exact=True)
 a().wait_for();assert a().is_disabled();assert section.locator('.google-readonly').count()==0
 section.get_by_role('button',name='Reconnect to enable task check-offs',exact=True).click();page.wait_for_function('document.querySelector(".google-task-check")?.disabled===false');assert page.evaluate('grant.include_granted_scopes') is True;assert page.evaluate('grant.scope.includes("https://www.googleapis.com/auth/tasks")');assert not page.evaluate('grant.scope.includes("calendar.events")')
 before=page.evaluate("localStorage.getItem('lr.todayTasks')");a().click();page.wait_for_function('document.querySelector("[data-task=a] .google-task-check")?.getAttribute("aria-busy")==="false"');assert a().get_attribute('aria-checked')=='true';assert a().locator('svg').count()==1;assert a().evaluate('e=>e===document.activeElement');assert section.locator('.google-task-row').first.get_attribute('data-task')=='a'
 section.locator('[data-task=a]').wait_for(state='detached',timeout=6000);undo=section.get_by_role('button',name='Undo PRIVATE_TASK_A',exact=True);assert undo.is_visible();assert undo.evaluate('e=>e===document.activeElement');undo.click();page.wait_for_function('document.querySelector("[data-task=a] .google-task-check")?.getAttribute("aria-busy")==="false"');assert a().get_attribute('aria-checked')=='false'
 b().click();section.get_by_role('button',name='Undo PRIVATE_TASK_B',exact=True).click();page.wait_for_timeout(2700);assert b().get_attribute('aria-checked')=='false'
 failure['on']=True;a().click();section.locator('.google-task-error').wait_for();assert a().get_attribute('aria-checked')=='false';assert section.get_by_role('button',name='Undo PRIVATE_TASK_A',exact=True).count()==0
 failure['on']=False;a().click();section.get_by_role('button',name='Undo PRIVATE_TASK_A',exact=True).wait_for();picker=section.get_by_role('combobox',name='Google task list',exact=True);picker.select_option('work');section.get_by_role('checkbox',name='PRIVATE_WORK',exact=True).wait_for();assert section.get_by_role('button',name='Undo PRIVATE_TASK_A',exact=True).count()==0
 picker.select_option('@default');section.get_by_role('button',name='Undo PRIVATE_TASK_A',exact=True).click();a().wait_for();assert writes[-1][0]=='@default';assert writes[-1][2]=={'status':'needsAction','completed':None}
 assert page.evaluate("localStorage.getItem('lr.todayTasks')")==before
 notebook=page.locator('.task-notebook');journey=notebook.locator('.task-journey');assert journey.count()==1;assert notebook.locator('h3').count()==0;assert journey.evaluate('e=>e.nextElementSibling.classList.contains("today-task-form")');assert page.locator('.today-tasks > .task-journey').count()==0;assert journey.evaluate('e=>getComputedStyle(e).borderTopWidth')=='0px'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.todayUI.refresh()}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':1000});section.scroll_into_view_if_needed();assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/task-checkoffs-{phase}-{width}.png')
 assert 'PRIVATE_TASK' not in page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');section.get_by_role('button',name='Disconnect',exact=True).click();assert section.locator('.google-task-check,.google-task-feedback').count()==0;assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: incremental consent, badge removed, check/hold/removal/Undo/focus, immediate Undo, failed write, list switching, notebook journey, privacy, responsive themes')
