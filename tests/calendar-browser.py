"""npm run build && python3 tests/calendar-browser.py. Private calendar at mobile/desktop widths."""
import functools,json,re
from datetime import date,timedelta
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
 c.add_init_script("""localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({sound:false,music:false,realtime:false,phase:'day',liveExtras:false,liveWeather:false,visitors:false,mischief:false,calmPerformance:true}));const d=new Date(),day=String(d.getFullYear())+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('lr.atlas',JSON.stringify({holidays:{[d.getFullYear()]:{at:Date.now(),rows:[{date:day,name:'Fixture Canadian holiday',localName:'Fixture Canadian holiday'}]}}}));""")
 external=[]
 def local_route(r):
  if r.request.url.endswith('/calendar.js'):r.fulfill(content_type='application/javascript',body=re.sub(r"const GOOGLE_CLIENT_ID='[^']*';", "const GOOGLE_CLIENT_ID='';", (ROOT/'www/calendar.js').read_text()))
  elif r.request.url.startswith('http://127.0.0.1:'):r.continue_()
  else:external.append(r.request.url);r.abort()
 c.route('**/*',local_route);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.calendar');page.evaluate('__lr.renderLoop.stop()')
 selected=page.evaluate("""() => {const a=__lr;a.room.items=[];a.room.n=10;a.setMode('explore',true);window.calPiece=a.room.add(a.room.make('calendar',{k:0,u:3,e:10}));window.plant=a.room.add(a.room.make('bonsai',{x:2,z:2}));a.room.add(a.room.make('cat',{x:4,z:3}));window.bowl=a.room.add(a.room.make('foodbowl',{x:4,z:4}));a.changed();const day=LRCalendar.day(new Date());a.calendarModel.append('letter',{id:'fixture-letter'});a.calendarModel.append('tea');a.calendarModel.append('tasks',{id:'1'});a.calendarModel.append('tasks',{id:'2'});a.calendarModel.append('tasks',{id:'3'});a.interact(plant.id);a.interact(bowl.id);a.roomTools.brew(3);a.todayTasks.add('Calendar task');a.todayTasks.check(a.todayTasks.list().at(-1).id,true);const scene=a.files.add('Scenes',{title:'Kyoto memory',decor:LRWidgets.shareDecor(a.room.serialize())});const raw=JSON.parse(localStorage.getItem('lr.scenes'));raw.files.find(f=>f.id===scene.id).createdAt=+new Date(new Date().getFullYear()-1,new Date().getMonth(),new Date().getDate(),12);localStorage.setItem('lr.scenes',JSON.stringify(raw));a.interact(calPiece.id);return day;}""")
 body=page.locator('#sheetBody');assert body.locator('h2.calendar-heading .calendar-month').count()==1;assert body.get_by_role('button',name='Connect Google Calendar',exact=True).is_disabled();assert 'not been configured' in body.inner_text();assert body.locator('.calendar-day').count()>=28
 today=body.locator(f'[data-date="{selected}"]');assert today.get_attribute('aria-current')=='date';assert today.locator('[data-kind=tasks]').count()==1;assert today.locator('[data-kind=plant]').count()==1
 heading=body.locator('.calendar-nav h3').inner_text();body.get_by_role('button',name='Next month',exact=True).click();assert body.locator('.calendar-nav h3').inner_text()!=heading;body.get_by_role('button',name='Previous month',exact=True).click();assert body.locator('.calendar-nav h3').inner_text()==heading
 # Existing cached holiday and forecast gates are independent and do not fetch locations.
 page.evaluate("""() => {const a=__lr;a.meta.liveExtras=true;a.meta.liveWeather=true;a.meta.weatherFetchedAt=Date.now();a.meta.weatherDetails={forecast:Array.from({length:7},(_,i)=>({date:LRCalendar.day(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+i,12)),condition:i%2?'rain':'clear',high:14+i,low:4+i}))};a.calendar.month();}""")
 assert today.locator('.calendar-holiday').count()==1;assert body.locator('.calendar-forecast>div').count()==7;today.click();assert 'Fixture Canadian holiday' in body.inner_text();assert 'Finished 4 tasks' in body.inner_text();assert 'Wrote a letter' in body.inner_text();assert 'Kyoto memory' in body.inner_text();assert body.locator('.calendar-moon').inner_text()
 body.get_by_role('button',name='Dismiss memory',exact=True).click();assert body.locator('.calendar-reminiscence').count()==0
 body.get_by_label('Title',exact=True).fill('PRIVATE_LOCAL_EVENT');body.get_by_label('Date',exact=True).fill(selected);body.get_by_role('button',name='Add event',exact=True).click();assert body.locator('.calendar-event b').inner_text()=='PRIVATE_LOCAL_EVENT'
 body.get_by_role('button',name='Edit',exact=True).click();body.locator('.calendar-event').get_by_label('Title',exact=True).fill('PRIVATE_EDITED_EVENT');body.get_by_role('button',name='Save event',exact=True).click();assert body.locator('.calendar-event b').inner_text()=='PRIVATE_EDITED_EVENT'
 body.get_by_role('button',name='Back to month',exact=True).click();assert today.locator('.calendar-local').count()==1;today.click();body.get_by_role('button',name='Delete',exact=True).click();assert body.locator('.calendar-event').count()==0;body.get_by_role('button',name='Back to month',exact=True).click();assert today.locator('.calendar-local').count()==0
 page.evaluate('__lr.meta.liveExtras=false;__lr.meta.liveWeather=false;__lr.calendar.month()');assert body.locator('.calendar-holiday').count()==0;assert body.locator('.calendar-forecast').count()==0
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true);__lr.view.draw()}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});body.evaluate('e=>Promise.all(e.getAnimations().map(a=>a.finished))');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/calendar-{phase}-{width}.png')
 page.keyboard.press('Escape');assert 'open' not in page.locator('#sheet').get_attribute('class');page.click('#bHome');page.locator('[data-app=calendar]').click();assert body.locator('h2.calendar-heading .calendar-month').count()==1
 decoded=page.evaluate('async()=>__lr.readCode(await __lr.roomCode())');assert all(t not in json.dumps(decoded) for t in ['PRIVATE_','activityLog','calendarEvents','googleCalendarToken']);assert not external,external;assert not errors,errors
 print('PASS calendar furniture/Control Centre, month navigation, ritual hooks and dots, holiday/forecast opt-ins, moon/detail/memory, private event CRUD, unconfigured Google, Escape and mobile/desktop day/night without network or console errors',flush=True)
 # Exercise the configured static browser flow with a fake GIS script and API.
 c2=b.new_context(viewport={'width':390,'height':844},timezone_id='America/Toronto');c2.add_init_script("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({sound:false,music:false,liveWeather:false,liveExtras:false,calmPerformance:true}))")
 response_status=200;google_calls=[];script_calls=[]
 def connected_route(r):
  u=r.request.url
  if u.endswith('/calendar.js'):
   r.fulfill(content_type='application/javascript',body=re.sub(r"const GOOGLE_CLIENT_ID='[^']*';", "const GOOGLE_CLIENT_ID='fixture-client';", (ROOT/'www/calendar.js').read_text()))
  elif u.startswith('http://127.0.0.1:'):r.continue_()
  elif u=='https://accounts.google.com/gsi/client':
   script_calls.append(u);r.fulfill(content_type='application/javascript',body="window.google={accounts:{oauth2:{initTokenClient:o=>{window.oauthOptions={scope:o.scope,include_granted_scopes:o.include_granted_scopes};return {requestAccessToken:()=>o.callback({access_token:'TEST_PRIVATE_TOKEN',scope:o.scope,expires_in:3600})}},revoke:()=>{}}}};")
  elif u.startswith('https://www.googleapis.com/calendar/v3/calendars/primary/events?'):
   google_calls.append(r.request);r.fulfill(status=response_status,headers={'access-control-allow-origin':'*'},content_type='application/json',body=json.dumps({'items':[{'id':'fixture-google','summary':'A Google read-only visit','start':{'date':selected},'end':{'date':str(date.fromisoformat(selected)+timedelta(days=1))}}]}))
  elif u.startswith('https://tasks.googleapis.com/tasks/v1/'):
   r.fulfill(content_type='application/json',headers={'access-control-allow-origin':'*'},body=json.dumps({'items':[]}))
  else:r.abort()
 c2.route('**/*',connected_route);g=c2.new_page();g.on('pageerror',lambda e:errors.append(e.stack));g.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');g.wait_for_function('!!window.__lr?.calendar');g.evaluate('__lr.renderLoop.stop();__lr.calendar.open()');assert not script_calls and not google_calls
 gb=g.locator('#sheetBody');gb.get_by_role('button',name='Connect Google Calendar',exact=True).click();g.wait_for_function('__lr.googleCalendar.connected');g.wait_for_function('document.querySelector(".calendar-google")');assert len(script_calls)==1;assert google_calls[0].headers['authorization']=='Bearer TEST_PRIVATE_TOKEN';assert g.evaluate('oauthOptions.scope')=='https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly';assert g.evaluate('oauthOptions.include_granted_scopes')==False
 gd=gb.locator(f'[data-date="{selected}"]');assert gd.locator('.calendar-google').count()==1;gd.click();g.wait_for_function('document.querySelector(".calendar-remote").textContent.includes("A Google read-only visit")');gb.get_by_role('button',name='Back to month',exact=True).click();assert len(google_calls)==1
 response_status=401;gb.get_by_role('button',name='Next month',exact=True).click();gb.get_by_role('button',name='Reconnect Google Calendar',exact=True).wait_for();assert g.evaluate('localStorage.getItem(LRCalendar.TOKEN)')==None;assert gb.locator('.calendar-day').count()>=28
 response_status=200;gb.get_by_role('button',name='Reconnect Google Calendar',exact=True).click();g.wait_for_function('__lr.googleCalendar.connected');gb.get_by_role('button',name='Disconnect',exact=True).click();assert not g.evaluate('__lr.googleCalendar.connected');assert g.evaluate('localStorage.getItem(LRCalendar.TOKEN)')==None
 assert not errors,errors;print('PASS configured GIS browser-token opt-in, minimal scope, cached Google markers/details, reconnect and disconnect with stubbed Google only',flush=True);b.close()
server.shutdown()
