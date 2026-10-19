"""Build www first; verify Daily News and the intact journal archives."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for width in [390,1280]:
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  context.add_init_script('''if(!localStorage.getItem('newsFixture')){
   localStorage.setItem('newsFixture','true');const now=Date.now(),d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
   const room={v:1,name:'Newsroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};
   const data={'lr.intro':true,'lr.rooms':[{id:101,name:room.name,n:0}],'lr.room.101':room,'lr.menuTab':'Journal','lr.meta':{current:101,phase:'night',realtime:false,visitors:false,mischief:false,calmPerformance:true},'lr.found':['tea'],'lr.journalNews':{days:[date],moments:[{id:'tea',date,time:now}]},'lr.catJournal':[{time:now-1000,cat:1,name:'Diego',kind:'eat',coat:0,text:'Inspected dinner. Ate the evidence.'},{time:now-2000,cat:2,name:'Luna',kind:'nap',coat:1,text:'Held the room down with my whole body. Important work.'}]};
   for(const [k,v] of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));}''')
  context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
  context.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','exportedAt':'','clips':[]}))
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
  # A saved 'Journal' menu choice now lands on the To-Do tab, which holds the task notebook.
  page.click('#bMenu');assert page.locator('.menu-nav [role=tab][aria-selected=true]').get_attribute('aria-label')=='To-Do';assert page.locator('#menu-todo .today-tasks').is_visible();page.keyboard.press('Escape')
  # The diaries live in the Cozy moments card under the room name.
  page.click('#disc');page.locator('#cozyMoments').wait_for();page.locator('#bCatDiary').click();assert page.locator('#catDiary .d').count()==2
  page.locator('#bMomentDiary').click();assert page.locator('#journalFeed > .d').count()>50;assert page.locator('#journalFeed .journal-paper').count()==0
  page.screenshot(path=f'/tmp/cozy-moments-{width}.png');assert page.locator('#cozyMoments').evaluate('e=>e.getBoundingClientRect().right<=innerWidth');page.keyboard.press('Escape');assert page.locator('#cozyMoments').is_hidden()
  # There is no Daily News anywhere; Control Center offers the Daily Brief instead.
  page.click('#bHome');assert page.locator('#homeView [data-app=news]').count()==0;brief=page.locator('#homeView [data-app=digest]');assert 'Daily Brief' in brief.inner_text();brief.click()
  paper=page.locator('.drift-paper');paper.wait_for();assert page.locator('.drift-masthead').inner_text()=='Daily Brief';assert page.locator('.journal-paper').count()==0;assert page.evaluate('typeof __lr.dailyNewsSheet')=='undefined'
  assert paper.locator('.drift-section[data-type=forecast]').count()==1;assert page.evaluate('document.documentElement.scrollWidth <= innerWidth');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
  page.screenshot(path=f'/tmp/daily-brief-{width}.png')
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("#sheet").classList.contains("open")');assert not errors,errors
  context.close()
 browser.close()
server.shutdown()
print('PASS: To-Do tab, cozy moments card with intact archives, no Daily News, Daily Brief from Control Center, Escape, mobile/desktop; no console errors')
