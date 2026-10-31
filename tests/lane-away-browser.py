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
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:501,name:home.name,n:1}],'lr.room.501':home,'lr.meta':{current:501,phase:'day',weather:'clear',realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}'''
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

 # Simulate an app closed for nine days, with a saved weather forecast.
 page.evaluate("""()=>{
  const town=LRLane.cleanTown({bench:{stage:3,color:'sage',last:'2026-11-01'}});
  town.beds[0]={plant:'sunflower',planted:'2026-11-01',water:['2026-11-01']};
  localStorage.setItem('lr.lane',JSON.stringify({lastVisit:'2026-11-01',town,life:{last:'2026-11-01',weather:{'2026-11-02':'rain','2026-11-03':'rain','2026-11-04':'clear','2026-11-05':'rain'}}}));
 }""")
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 assert len(town()['beds'][0]['water'])==4,'startup catches up without opening Lane'
 page.click('#bLane');assert 'Lane showers watered the garden' in sheet.inner_text();assert 'Juniper left a book' in sheet.inner_text();close()
 street(10);assert piece('bench')['c']==6
 tap('bench');assert 'Juniper’s book' in sheet.inner_text()
 page.screenshot(path='/tmp/lane-away-book.png')
 sheet.get_by_role('button',name='Leave a thank-you bookmark').click()
 assert 'Juniper’s book' not in sheet.inner_text();assert piece('bench')['c']==3
 close();page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.lane")).life.book') is None
 assert len(town()['beds'][0]['water'])==4
 street(10);assert piece('bench')['c']==3
 assert not errors,errors
 print('PASS offline town: startup catch-up, rain growth, visible book, thank-you interaction, reload without duplicate growth or book')
 browser.close();server.shutdown()
