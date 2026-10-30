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

 # Day 1: the menu hints at what needs a hand; the street starts bare and broken.
 page.click('#bLane');hint=page.locator('.lane-todo').inner_text();assert 'bench needs a hand' in hint and 'courtyard' in hint,hint;close()
 street(10);assert piece('bench')['c']==0 and piece('bed:0')['c']==0 and piece('court')['c']==0 and juniper()==[2,8]
 tap('bed:0');sheet.get_by_role('button',name='🌻 Sunflowers').click();done();assert piece('bed:0')['c']==2,piece('bed:0')   # planted and watered: sprouting
 tap('bench');sheet.get_by_role('button',name='Fit new slats').click();done();assert piece('bench')['c']==1
 tap('court');sheet.get_by_role('button',name='An oilcloth table').click();done();assert piece('court')['c']==1
 assert page.evaluate('__lr.room.items.some(i=>i.t==="mxmesa")'),'the table appears straight away'
 # Once a day: the second visit just says so.
 tap('bench');assert 'enough for today' in sheet.inner_text();close()
 tap('bed:0');assert 'Watered today' in sheet.inner_text();close()
 tap('court');assert 'One new piece a day' in sheet.inner_text();close()

 # Day 2: water, sand, chairs.
 street(11);assert piece('bed:0')['c']==2
 tap('bed:0');sheet.get_by_role('button',name='💧 Water it').click();done();assert piece('bed:0')['c']==3
 tap('bench');sheet.get_by_role('button',name='Sand it smooth').click();done();assert piece('bench')['c']==2
 tap('court');sheet.get_by_role('button',name='Woven equipal chairs').click();done()
 # Evening with chairs in the courtyard: Juniper stays out to read there.
 street(11,phase='evening');assert juniper()==[13,10],juniper()

 # Day 3, rainy: the rain waters the bed on its own, and Puddle mentions it. Paint the bench coral.
 street(12,weather='rain');assert piece('bed:0')['c']==4,'rain watered it'
 page.evaluate('__lr.interact(+Object.keys(__lr.laneVisit.actions).find(k=>__lr.laneVisit.actions[k]==="talk:puddle"))');sheet.get_by_text('supervising').wait_for();close()
 bal=page.evaluate('__lr.shop.balance');tap('bench');sheet.get_by_role('button',name='Coral').click();done()
 assert piece('bench')['c']==4 and page.evaluate('__lr.shop.balance')>bal,'a finished bench earns a few Fireflies'
 tap('court');sheet.get_by_role('button',name='Stone lanterns').click();done()

 # Day 4: the sunflowers bloom; Juniper reads on the mended bench.
 street(13);tap('bed:0');sheet.get_by_role('button',name='💧 Water it').click();done();assert piece('bed:0')['c']==5
 assert juniper()==[4,7],juniper()
 tap('court');sheet.get_by_role('button',name='Talavera planters').click();done()
 # Day 5: the fountain finishes the courtyard.
 street(14);tap('court');sheet.get_by_role('button',name='A plaza fountain').click();done()
 assert piece('court')['c']==5 and page.evaluate('["mxmesa","mxequipal","toro","tavplanter","mxfountain"].every(t=>__lr.room.items.some(i=>i.t===t))')
 t=town();assert t['bench']=={'stage':3,'color':'coral','last':'2026-11-12'} and t['court']['picks']==[0,1,0,0,1],t

 # The Notice Board and the neighbours notice.
 page.get_by_role('button',name='Notice board',exact=True).click();notes=page.locator('#sheetBody .lane-town-notes').inner_text()
 assert 'in full bloom' in notes and 'mended' in notes and 'courtyard is finished' in notes,notes;close()
 page.evaluate('__lr.interact(+Object.keys(__lr.laneVisit.actions).find(k=>__lr.laneVisit.actions[k]==="talk:juniper"))');sheet.get_by_text('mended bench').first.wait_for();close()
 # It all stays: back home and out again tomorrow, the street remembers.
 street(20);assert piece('bench')['c']==4 and piece('bed:0')['c']==5 and piece('court')['c']==5
 page.evaluate('__lr.returnFromLane()');assert not page.evaluate('Object.keys(localStorage).some(k=>/^lr\\.room\\.-/.test(k))')
 assert not errors,errors
 print('PASS lane town: garden grows over watered days (rain counts), bench mended over three days with a paint colour, courtyard furnished one chosen piece a day, Juniper moves to the bench and courtyard, notice board and neighbours notice, it all persists')
 browser.close();server.shutdown()
