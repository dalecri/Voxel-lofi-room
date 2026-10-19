"""Build www first. Scheduled Today tasks and optional dashboard font, fixture Google only."""
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
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);context=browser.new_context(viewport={'width':390,'height':1000},timezone_id='America/Toronto',reduced_motion='reduce')
 context.add_init_script('''const D=Date,start=D.now();window.__taskClock=new D(2026,9,19,16,59).getTime();window.Date=class extends D{constructor(...a){super(...(a.length?a:[window.__taskClock+D.now()-start]))}static now(){return window.__taskClock+D.now()-start}};if(!localStorage.focusFixture){localStorage.focusFixture='1';for(const [k,v] of Object.entries({'lr.intro':true,'lr.meta':{phase:'day',realtime:false,sound:false,music:false,visitors:false,calmPerformance:true},'lr.googleCalendarToken':{access_token:'FIXTURE_TOKEN',scope:'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly https://www.googleapis.com/auth/tasks',expiresAt:Date.now()+7*86400000,listId:'other'}}))localStorage.setItem(k,JSON.stringify(v));}''')
 writes=[];saved={};caption_offline=False
 context.add_init_script("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text}}})")
 captions={'exportedFrom':'TwoStoryCaptions','exportedAt':'2026-10-19T12:00:00Z','clips':[{'id':str(i),'desc':f'Original idea {i}','status':'idea','created':f'2026-10-19T12:00:0{i}Z','selectedTones':['Relatable'],'platform':'Both','captions':['A tiny synthetic caption'] if i==0 else None} for i in range(3)]}
 def route(r):
  u=r.request.url
  if u.startswith('http://127.0.0.1:'):r.continue_()
  elif 'twostorycaptions.json' in u:
   if caption_offline:r.fulfill(status=200,body='{broken',content_type='application/json')
   else:r.fulfill(json=captions)
  elif 'www.googleapis.com/calendar' in u:r.fulfill(json={'items':[]})
  elif 'tasks.googleapis.com' in u:
   if '/users/@me/lists' in u:r.fulfill(json={'items':[{'id':'statcan','title':'StatCan'},{'id':'todo','title':'Todo'},{'id':'other','title':'Other'}]});return
   parts=u.split('/lists/')[1].split('/');listid=parts[0]
   if r.request.method=='PATCH':
    data=r.request.post_data_json;writes.append((listid,parts[2],data));saved[(listid,parts[2])]=data['status'];r.fulfill(json={'id':parts[2],**data});return
   r.fulfill(json={'items':[{'id':'one','title':listid+' task for today','due':page.evaluate('LRCalendar.day(new Date())')+'T00:00:00Z','status':saved.get((listid,'one'),'needsAction')},{'id':'two','title':listid+' tomorrow task','due':page.evaluate('()=>{const d=new Date();d.setDate(d.getDate()+1);return LRCalendar.day(d)}')+'T00:00:00Z'},{'id':'no-date','title':listid+' no deadline'}]})
  else:r.abort()
 context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 def ready():page.wait_for_function('!!window.__lr?.todayUI');page.evaluate('__lr.renderLoop.stop()')
 def open_today():page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()
 def reopen(hour=None,day=19):
  page.keyboard.press('Escape')
  if hour is not None:page.evaluate('({hour,day})=>window.__taskClock=new Date(2026,9,day,hour,0).getTime()',{'hour':hour,'day':day})
  open_today()
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();open_today();focus=page.locator('.today-google-focus');focus.get_by_role('checkbox',name='statcan task for today',exact=True).wait_for();assert focus.locator('[data-day=upcoming]').count()==0;assert 'tomorrow task' not in focus.inner_text();assert 'no deadline' not in focus.inner_text();assert page.evaluate('__lr.googleCalendar.selectedList')=='other'
 assert focus.evaluate('e=>e.parentElement.classList.contains("today-main")&&e.parentElement.nextElementSibling.classList.contains("today-side")')
 week=page.locator('.today-week');assert week.locator('button').count()==7;assert week.locator('[aria-current=date]').get_attribute('data-date')=='2026-10-19';assert week.locator('button').last.get_attribute('data-date')=='2026-10-25'
 week.locator('button').last.click();page.locator('.calendar-detail').wait_for();assert 'October 25' in page.locator('#sheetBody > h2').inner_text();page.keyboard.press('Escape');open_today()
 french=page.get_by_role('button',name='French Word',exact=True);caption=page.get_by_role('button',name='TwoStoryCaption',exact=True);assert french.get_attribute('aria-expanded')=='true';assert caption.get_attribute('aria-expanded')=='false';assert not page.locator('.today-caption-desk').is_visible()
 caption.click();assert caption.get_attribute('aria-expanded')=='true';assert not page.locator('.today-french').is_visible();caption.press('ArrowLeft');assert french.get_attribute('aria-expanded')=='true';assert french.evaluate('e=>e===document.activeElement');french.press('End');assert caption.get_attribute('aria-expanded')=='true'
 desk=page.locator('.today-caption-desk');desk.locator('.today-caption-text').wait_for();assert desk.locator('.today-caption-text').count()==1
 first=desk.locator('.today-caption-text').inner_text();desk.get_by_role('button',name='Copy caption',exact=True).click();assert page.evaluate('window.copied')==first
 desk.get_by_role('button',name='Next caption',exact=True).click();assert desk.locator('.today-caption-text').inner_text()!=first;desk.get_by_role('button',name='Previous caption',exact=True).click();assert desk.locator('.today-caption-text').inner_text()==first
 assert page.locator('.today-side .today-quick [data-ritual=tea]').count()==1;assert page.locator('.today-side .today-quick [data-ritual=garden]').count()==1;assert page.locator('.today-main .french-today-card').count()==0;assert page.locator('.today-feature .french-today-card').count()==1
 assert page.locator('.today-weather').evaluate('e=>[...e.children].map(n=>n.className).join("|")')=='today-welcome|today-weather-details|today-week|today-feature|today-main|today-side'
 assert page.locator('.today-date').count()==1
 assert page.locator('.today-weather-details').evaluate('e=>e.nextElementSibling.classList.contains("today-week")');assert page.locator('.today-quick [data-ritual]').evaluate_all('es=>es.map(e=>e.dataset.ritual)')==['tea','garden','letter','ideas']
 for _ in range(3):
  payload=desk.locator('.today-caption-text').inner_text();desk.get_by_role('button',name='Copy caption',exact=True).click();assert page.evaluate('window.copied')==payload;desk.get_by_role('button',name='Next caption',exact=True).click()
 caption_offline=True;desk.get_by_role('button',name='Refresh captions',exact=True).click();page.wait_for_function('document.querySelector(".today-caption-meta").textContent.includes("cached")');assert desk.locator('.today-caption-text').inner_text()==first;caption_offline=False
 check=focus.get_by_role('checkbox',name='statcan task for today',exact=True);check.click();focus.get_by_role('button',name='Undo statcan task for today',exact=True).wait_for();assert writes[-1][0]=='statcan';check.wait_for(state='detached',timeout=6000);focus.get_by_role('button',name='Undo statcan task for today',exact=True).click();check.wait_for();assert writes[-1][2]['status']=='needsAction'
 reopen(17);focus.get_by_role('checkbox',name='todo task for today',exact=True).wait_for();assert 'StatCan' not in focus.inner_text();assert page.evaluate('__lr.googleCalendar.selectedList')=='other'
 reopen(9,24);focus.get_by_role('checkbox',name='todo task for today',exact=True).wait_for();assert page.evaluate('__lr.googleCalendar.selectedList')=='other'
 reopen(9,26);focus.get_by_role('checkbox',name='statcan task for today',exact=True).wait_for();focus.get_by_role('button',name='All tasks',exact=True).click();assert page.get_by_role('tab',name='To-Do',exact=True).get_attribute('aria-selected')=='true';manual=page.locator('#menu-todo .task-google-page');manual.get_by_role('checkbox',name='other task for today',exact=True).wait_for()
 # Font choice persists in lr.meta and stays out of other tool sheets.
 page.get_by_role('tab',name='Settings',exact=True).click();toggle=page.get_by_role('switch',name='Monospace dashboard',exact=True);toggle.click();assert page.locator('#sheetBody').get_attribute('data-dashboard-font')=='mono';assert page.evaluate('__lr.meta.dashboardMono') is True;assert toggle.evaluate('e=>e===document.activeElement')
 page.get_by_role('tab',name='Today',exact=True).click();focus.get_by_role('checkbox',name='statcan task for today',exact=True).wait_for();assert focus.locator('.google-task-copy b').evaluate('e=>getComputedStyle(e).fontFamily.includes("VT323")')
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':1000});page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');boxes=page.locator('.today-quick [data-ritual]').evaluate_all('es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,width:r.width,height:r.height}})');assert max(b['top'] for b in boxes)-min(b['top'] for b in boxes)<1;assert max(b['width'] for b in boxes)-min(b['width'] for b in boxes)<1;assert max(b['height'] for b in boxes)-min(b['height'] for b in boxes)<1;page.get_by_role('button',name='French Word',exact=True).click();page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');assert page.locator('.today-feature').bounding_box()['height']<500;assert focus.bounding_box()['y']>=page.locator('.today-feature').bounding_box()['y']+page.locator('.today-feature').bounding_box()['height'];assert page.locator('.today-side').bounding_box()['y']>=focus.bounding_box()['y']+focus.bounding_box()['height'];page.screenshot(path=f'/tmp/today-week-french-{phase}-{width}.png');page.get_by_role('button',name='TwoStoryCaption',exact=True).click();assert desk.is_visible();assert page.locator('.today-feature').bounding_box()['height']<500;assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');page.screenshot(path=f'/tmp/today-week-caption-{phase}-{width}.png')
 page.reload(wait_until='networkidle');ready();open_today();assert page.locator('#sheetBody').get_attribute('data-dashboard-font')=='mono';page.keyboard.press('Escape');page.evaluate("__lr.roomToolsUI.open('tea')");assert page.locator('#sheetBody').get_attribute('data-dashboard-font') is None;page.keyboard.press('Escape');open_today();page.get_by_role('tab',name='Settings',exact=True).click();page.get_by_role('switch',name='Monospace dashboard',exact=True).click();assert page.locator('#sheetBody').get_attribute('data-dashboard-font')=='default';page.get_by_role('tab',name='Today',exact=True).click();page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');page.set_viewport_size({'width':390,'height':1000});page.screenshot(path='/tmp/today-week-default.png')
 assert 'statcan task for today' not in page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert page.evaluate('localStorage.getItem("lr.dashboardFont")') is None;assert not errors,errors
 print('PASS 7-day calendar navigation, expanding French/caption cards and keyboard focus, caption cache/copy, scheduled weekday/17:00/weekend lists, independent manual picker, today-only focus, check/hold/Undo, font toggle/persistence/scope, mobile/desktop day/night, private codes, no console errors',flush=True);browser.close()
server.shutdown()
