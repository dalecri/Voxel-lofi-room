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
 def appearance(row):
  return row.evaluate("""e=>{const r=getComputedStyle(e),t=getComputedStyle(e.querySelector('.google-task-copy b')),c=getComputedStyle(e.querySelector('.task-checkmark'));return [r.backgroundColor,r.boxShadow,r.borderRadius,r.padding,r.columnGap,t.fontFamily,t.fontSize,t.lineHeight,c.width,c.height,c.borderRadius,c.boxShadow]}""")
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':1000});page.get_by_role('tab',name='Today',exact=True).click();today=page.locator('.today-google-focus .google-task-row').first;today.wait_for();page.mouse.move(0,0);today_style=appearance(today);assert today_style[2]=='8px';assert today_style[8:10]==['20px','20px'];assert 'monospace' in today_style[5];assert today.evaluate('e=>getComputedStyle(e).animationName')=='none'
   page.locator('.today-google-focus').screenshot(path=f'/tmp/shared-tasks-{phase}-{width}.png')
   page.get_by_role('tab',name='To-Do',exact=True).click();page.get_by_role('tab',name='Google',exact=True).click();other=page.locator('#menu-todo .google-task-row').first;other.wait_for();page.mouse.move(0,0);assert appearance(other)==today_style,(phase,width,appearance(other),today_style)
   assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
 page.get_by_role('tab',name='Today',exact=True).click();check=focus.get_by_role('checkbox',name='statcan task for today',exact=True);check.click();row=focus.locator('.google-task-row.completed');row.wait_for();assert row.locator('.google-task-copy b').evaluate('e=>getComputedStyle(e).opacity')=='0.4';assert row.locator('.task-checkmark').evaluate('e=>getComputedStyle(e,"::after").width')=='6px';assert writes[-1][0]=='statcan';focus.get_by_role('button',name='Undo statcan task for today',exact=True).click();check.wait_for();assert writes[-1][2]['status']=='needsAction'
 assert not errors,errors;browser.close()
server.shutdown()
print('PASS: identical Today/To-Do task card surfaces, spacing, monospace text and etched marks across themes/widths; reduced motion; check/Undo preserved')
