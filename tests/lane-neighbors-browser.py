"""npm run build && python3 tests/lane-neighbors-browser.py. Neighbours on the walkable Lane: Mallow opens the shop in
the morning, Juniper reads outside in the afternoon, Puddle visits when it rains; tapping one starts a short chat, and
tomorrow they remember what you answered. Routines follow the clock while you're on the street."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
FIXTURE='''if(!localStorage.nbFixture){localStorage.nbFixture='1';const home={v:1,n:10,name:'Home',wall:{style:'paint',color:0},floor:{style:'oak'},next:2,items:[{id:1,t:'desk',x:6,z:6,c:0,r:0}]};
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:301,name:home.name,n:1}],'lr.room.301':home,'lr.meta':{current:301,phase:'morning',weather:'rain',raining:true,realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');context.add_init_script(FIXTURE)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 figs=lambda:page.evaluate('__lr.room.items.filter(i=>["lanemallow","lanereader","lanestray"].includes(i.t)).map(i=>i.t).sort()')
 def tap(t):page.evaluate('t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id)',t);page.locator('#sheetBody .lane-talk').wait_for()
 talk=lambda:page.locator('#sheetBody .lane-talk')

 # A rainy morning: Mallow is out front opening up, Juniper reads the notices, Puddle shelters under the awning.
 page.evaluate('__lr.visitLaneRoom("street")');page.wait_for_function('__lr.laneVisit?.place==="street"')
 assert figs()==['lanemallow','lanereader','lanestray'],figs()

 # First chat with Mallow: a hello, one question, two answers; your answer is kept for tomorrow.
 tap('lanemallow');assert 'Mallow' in page.locator('#sheetBody').inner_text() and talk().locator('.lane-talk-replies button').count()==2
 first=talk().locator('.lane-talk-replies button').first.inner_text();talk().locator('.lane-talk-replies button').first.click()
 assert talk().locator('.lane-bubble.mine').inner_text()==first and 'remember this tomorrow' in talk().inner_text()
 mem=page.evaluate('JSON.parse(localStorage.getItem("lr.lane")).talks.mallow');assert mem['reply']==0,mem
 page.keyboard.press('Escape')
 # Again today: just a nod, no new question.
 tap('lanemallow');assert talk().locator('.lane-talk-replies').count()==0;page.keyboard.press('Escape')
 # "Tomorrow": the memory is a day old, so Mallow brings up your answer first, then asks something new.
 page.evaluate('''()=>{const s=JSON.parse(localStorage.getItem("lr.lane"));const d=new Date();d.setDate(d.getDate()-1);s.talks.mallow.date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem("lr.lane",JSON.stringify(s));}''')
 recall=page.evaluate('m=>LRLane.NEIGHBORS.mallow.topics.find(t=>t.id===m.topic).replies[m.reply][2]',mem)
 tap('lanemallow');assert talk().locator('.lane-bubble.remembered').inner_text()==recall and talk().locator('.lane-talk-replies button').count()==2;page.keyboard.press('Escape')

 # Puddle and Juniper have their own voices.
 tap('lanestray');assert 'Puddle' in page.locator('#sheetBody').inner_text() and 'rain' in talk().inner_text().lower();page.keyboard.press('Escape')
 tap('lanereader');assert 'Juniper' in page.locator('#sheetBody').inner_text();page.keyboard.press('Escape')

 # The Notice Board says where everyone is.
 page.get_by_role('button',name='Notice board',exact=True).click();nb=page.locator('#sheetBody .lane-neighbours')
 assert 'Mallow is opening up the shop' in nb.inner_text() and 'Puddle' in nb.inner_text();page.keyboard.press('Escape')

 # In the morning the shop's counter is empty (Mallow is outside), but you can still chat from the bar.
 page.evaluate('__lr.visitLaneRoom("shop")');page.wait_for_function('__lr.laneVisit?.place==="shop"')
 assert not page.evaluate('__lr.room.items.some(i=>i.t==="merchantcat")')
 page.get_by_role('button',name='Chat with Mallow',exact=True).click();talk().wait_for();page.keyboard.press('Escape')
 page.get_by_role('button',name='← The lane',exact=True).click();page.wait_for_function('__lr.laneVisit?.place==="street"')

 # The afternoon arrives while you're on the street: Mallow goes inside, Juniper takes her book under the porch (it's raining).
 page.evaluate('__lr.setPhase("day",true)');page.wait_for_function('!__lr.room.items.some(i=>i.t==="lanemallow")')
 assert figs()==['lanereader','lanestray'];assert page.evaluate('__lr.room.items.find(i=>i.t==="lanereader").z')==2
 # Evening: Juniper heads home; Puddle stays as long as it rains.
 page.evaluate('__lr.setPhase("evening",true)');page.wait_for_function('!__lr.room.items.some(i=>i.t==="lanereader")');assert figs()==['lanestray']
 page.evaluate('__lr.visitLaneRoom("shop")');page.wait_for_function('__lr.laneVisit?.place==="shop"');assert page.evaluate('__lr.room.items.some(i=>i.t==="merchantcat")')
 page.evaluate('__lr.returnFromLane()')
 assert 'talks' not in json.dumps(page.evaluate('async()=>__lr.readCode(await __lr.roomCode())')),'chats never travel in room codes'
 assert not errors,errors
 print('PASS lane neighbours: rainy-morning routines, chat with one question and two answers, a nod the same day, yesterday remembered, distinct voices, notice board list, Mallow out front then back inside, routines follow the clock on the street')
 browser.close();server.shutdown()
