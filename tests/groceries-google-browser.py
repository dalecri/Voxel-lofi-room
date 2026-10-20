"""Build www first. New groceries mirror to Housekeeping; failures preserve local items."""
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
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.fixture){localStorage.fixture='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({phase:'day',realtime:false,visitors:false,calmPerformance:true}));localStorage.setItem('lr.googleCalendarToken',JSON.stringify({access_token:'FIXTURE_TOKEN',scope:'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly https://www.googleapis.com/auth/tasks',expiresAt:Date.now()+3600000,listId:'work'}));}''')
 posts=[];state={'fail':False}
 def route(r):
  url=r.request.url
  if url.startswith('http://127.0.0.1:'):r.continue_()
  elif 'tasks.googleapis.com' in url:
   if r.request.method=='POST':
    assert '/lists/home/tasks' in url;posts.append(r.request.post_data_json)
    if state['fail']:r.fulfill(status=503,json={})
    else:r.fulfill(json={'id':'created','title':r.request.post_data_json['title']})
   else:r.fulfill(json={'items':[{'id':'work','title':'Work'},{'id':'home','title':'Housekeeping'}]} if '/users/@me/lists' in url else {'items':[]})
  elif 'twostorycaptions.json' in url:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]})
  else:r.abort()
 context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI');page.evaluate('__lr.renderLoop.stop()');page.click('#bHome');page.locator('[data-app=groceries]').click()
 def add(name):page.get_by_label('Add groceries',exact=True).fill(name);page.get_by_role('button',name='Add to list',exact=True).click()
 add('PRIVATE_MILK');page.get_by_text('Added to Housekeeping in Google Tasks.',exact=True).wait_for();assert posts==[{'title':'PRIVATE_MILK'}];assert page.locator('.grocery-name').all_text_contents()==['PRIVATE_MILK'];assert page.evaluate('__lr.googleCalendar.selectedList')=='work'
 state['fail']=True;add('PRIVATE_EGGS');page.locator('.roomtool-status').filter(has_text='Saved here.').wait_for();assert len(posts)==2;assert 'PRIVATE_EGGS' in page.locator('.grocery-name').all_text_contents()
 page.evaluate('__lr.googleCalendar.disconnect()');add('PRIVATE_BREAD');assert 'PRIVATE_BREAD' in page.locator('.grocery-name').all_text_contents();page.wait_for_timeout(200);assert len(posts)==2
 # Local check-offs and reopening do not create extra tasks or replay earlier groceries.
 page.get_by_role('checkbox',name='PRIVATE_MILK',exact=True).check();page.keyboard.press('Escape');page.evaluate('__lr.roomToolsUI.open("groceries")');assert page.get_by_role('checkbox',name='PRIVATE_MILK',exact=True).is_checked();assert len(posts)==2
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'PRIVATE_' not in raw;assert not errors,errors
 print('PASS groceries mirror once to Housekeeping, preserve local items on failure/offline, retain selection/check-offs, and stay private')
 browser.close()
server.shutdown()
