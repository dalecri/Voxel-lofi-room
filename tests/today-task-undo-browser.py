"""Build www first. Today completion feedback expires after three seconds; fixture Google only."""
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
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();open_today();focus=page.locator('.today-google-focus');check=focus.get_by_role('checkbox',name='statcan task for today',exact=True);check.wait_for();assert focus.get_by_role('button',name='All tasks',exact=True).count()==0
 check.click();undo=focus.get_by_role('button',name='Undo statcan task for today',exact=True);undo.wait_for();undo.click();check.wait_for();assert writes[-1][2]['status']=='needsAction'
 check.click();undo.wait_for();started=page.evaluate('performance.now()');page.wait_for_timeout(1500);assert undo.is_visible();undo.wait_for(state='detached',timeout=2200);elapsed=page.evaluate('performance.now()')-started;assert 2700<=elapsed<=3600,elapsed
 assert focus.locator('.google-task-feedback').count()==0;assert check.count()==0;assert saved[('statcan','one')]=='completed'
 # Repainting or reopening Today must not bring back an expired Undo.
 page.evaluate('__lr.googleCalendar.selectList("statcan")');assert focus.locator('.google-task-feedback').count()==0
 page.get_by_role('tab',name='To-Do',exact=True).click();page.get_by_role('tab',name='Google',exact=True).click();manual=page.locator('#menu-todo .task-google-page');manual.get_by_role('button',name='Undo statcan task for today',exact=True).wait_for();manual.get_by_role('button',name='Undo statcan task for today',exact=True).click();assert saved[('statcan','one')]=='needsAction'
 page.get_by_role('tab',name='Today',exact=True).click();check.wait_for();assert not errors,errors
 print('PASS Today Undo works immediately, removes the entire feedback after three seconds, stays expired on repaint, and preserves the To-Do Undo window')
 browser.close()
server.shutdown()
