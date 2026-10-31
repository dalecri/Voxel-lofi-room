"""npm run build && python3 tests/lane-town-browser.py. The Lane changes slowly over several (fixed-clock) days:
plant and water a garden bed until it blooms (rain waters it for you), mend the old bench over three days and pick a
paint colour, and furnish the courtyard one chosen piece a day. Juniper starts reading on the bench and in the
courtyard, the Notice Board tracks it all, and everything is visible on the street right away."""
import functools,datetime
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
FIXTURE='''if(!localStorage.tFixture){localStorage.tFixture='1';const home={v:1,n:10,name:'Home',wall:{style:'paint',color:0},floor:{style:'oak'},next:2,items:[{id:1,t:'desk',x:6,z:6,c:0,r:0}]};
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.fireflies':100,'lr.rooms':[{id:501,name:home.name,n:1}],'lr.room.501':home,'lr.meta':{current:501,phase:'day',weather:'clear',realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');context.add_init_script(FIXTURE)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.clock.set_fixed_time(datetime.datetime(2026,11,10,13,0))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 sheet=page.locator('#sheetBody')
 def piece(act):return page.evaluate('a=>{const id=Object.keys(__lr.laneVisit.actions).find(k=>__lr.laneVisit.actions[k]===a);const it=id&&__lr.room.get(+id);return it?{t:it.t,c:it.c||0,x:it.x,z:it.z}:null}',act)
 def tap(act):page.evaluate('a=>__lr.interact(+Object.keys(__lr.laneVisit.actions).find(k=>__lr.laneVisit.actions[k]===a))',act);sheet.locator('.lane-project').wait_for()
 def close():page.keyboard.press('Escape');page.wait_for_function("!document.querySelector('#sheet').classList.contains('open')")
 def done():page.wait_for_function("!document.querySelector('#sheet').classList.contains('open')")
 def street(day,weather='clear',phase='day'):
  page.evaluate('__lr.laneVisit&&__lr.returnFromLane()');page.clock.set_fixed_time(datetime.datetime(2026,11,day,13,0))
  page.evaluate(f"__lr.meta.weather='{weather}';__lr.setPhase('{phase}',true)");page.evaluate('__lr.visitLaneRoom("street")');page.wait_for_function('__lr.laneVisit?.place==="street"')
 town=lambda:page.evaluate('JSON.parse(localStorage.getItem("lr.lane")).town')
 juniper=lambda:page.evaluate('(()=>{const id=Object.keys(__lr.laneVisit.actions).find(k=>__lr.laneVisit.actions[k]==="talk:juniper");const it=id&&__lr.room.get(+id);return it?[it.x,it.z]:null})()')

 page.evaluate("localStorage.setItem('lr.fireflies','0')")
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 street(10);tap('bench')
 assert '5 Fireflies · You have 0' in sheet.inner_text()
 build=sheet.get_by_role('button',name='Fit new slats · 5 Fireflies');assert build.is_disabled()
 assert '5 more' in sheet.inner_text();assert town()['bench']['stage']==0
 page.screenshot(path='/tmp/town-project-price.png');close()
 page.evaluate("__lr.shop.earn('task','project-fixture');__lr.shop.earn('water','project-fixture')")
 tap('bench');assert sheet.get_by_role('button',name='Fit new slats · 5 Fireflies').is_enabled()
 sheet.get_by_role('button',name='Fit new slats · 5 Fireflies').click();done()
 assert piece('bench')['c']==1;assert page.evaluate('__lr.shop.balance')==0
 tap('bench');assert 'enough for today' in sheet.inner_text();close()
 tap('court');assert '10 Fireflies · You have 0' in sheet.inner_text()
 assert sheet.get_by_role('button',name='An oilcloth table · 10 Fireflies').is_disabled();close()
 page.evaluate("__lr.shop.earn('daily')")
 tap('court');sheet.get_by_role('button',name='An oilcloth table · 10 Fireflies').click();done()
 assert page.evaluate('__lr.shop.balance')==5;assert town()['court']['picks']==[0]
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 assert page.evaluate('__lr.shop.balance')==5;assert town()['bench']['stage']==1
 assert not errors,errors
 print('PASS project costs: insufficient funds, earn then build, exact debit, daily lock, courtyard choice and reload')
 browser.close();server.shutdown()
