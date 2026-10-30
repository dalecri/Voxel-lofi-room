"""npm run build && python3 tests/lane-walk-browser.py. The walkable Lane: step out of your front door onto the
street, stroll to Mallow's Shop and the Mail Room and walk in through their doors, come back out onto the street
in front of the place you left, and walk home through your own front door. Your home is never touched."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
FIXTURE='''if(!localStorage.walkFixture){localStorage.walkFixture='1';const home={v:1,n:10,name:'Walk home',wall:{style:'paint',color:0},floor:{style:'oak'},next:3,items:[{id:1,t:'roomdoor',k:0,u:3,e:0,c:0,r:0},{id:2,t:'desk',x:6,z:6,c:0,r:0}]};
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:201,name:home.name,n:2}],'lr.room.201':home,'lr.meta':{current:201,phase:'day',realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');context.add_init_script(FIXTURE)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 home=lambda:page.evaluate('()=>{const r=new LR.Room();r.load(JSON.parse(localStorage.getItem("lr.room.201")));return r.items.map(i=>[i.t,i.x,i.z,i.k,i.u]).join("|")}')
 before=home()
 place=lambda:page.evaluate('__lr.laneVisit?.place||null')
 def at(t):return page.evaluate('t=>{const it=__lr.room.items.find(i=>i.t===t);return it&&it.id}',t)
 def pos():return page.evaluate('[__lr.companion.brain.state.x,__lr.companion.brain.state.z]')
 def walk_into(x,z,until):
  page.evaluate('([x,z])=>{__lr.companion.takeControl({x,z,heading:Math.PI});__lr.view.fp.yaw=Math.PI;__lr.view.fp.look=0}',[x,z])
  page.keyboard.down('w');page.wait_for_function(until);page.keyboard.up('w')

 # 1. The Lane tab has a way outside; the street matches the tab: house, shop, mail, notice, left to right.
 page.click('#bLane');page.locator('.lane-walk').click();page.wait_for_function('__lr.laneVisit?.place==="street"')
 order=page.evaluate('["lanehome","laneshop","lanepost","laneboard"].map(t=>__lr.room.items.find(i=>i.t===t).x)');assert order==sorted(order),order
 assert page.locator('#laneVisitBar button').all_inner_texts()==['← Home','Notice board']
 page.evaluate('id=>__lr.interact(id)',at('laneboard'));page.locator('#sheetBody .lane-place').wait_for();page.keyboard.press('Escape')
 page.get_by_role('button',name='← Home',exact=True).click();assert place() is None and home()==before

 # 2. Any door at home can open onto the lane: pick "Out to the lane" and it sticks.
 page.evaluate('__lr.interact(1)');page.get_by_role('button',name='Out to the lane').click();page.wait_for_function('__lr.laneVisit?.place==="street"')
 page.get_by_role('button',name='← Home',exact=True).click();page.wait_for_function('!__lr.laneVisit')
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.room.201")).items.find(i=>i.id===1).link')==-100

 # 3. As your character: out the front door, along the sidewalk, into Mallow's Shop by walking into its door.
 page.click('#bCharacter');page.wait_for_function('!!__lr.view.fp')
 walk_into(3.5,0.5,'__lr.laneVisit?.place==="street"');page.wait_for_function('!!__lr.view.fp')
 x,z=pos();assert 1<x<4 and z>2.5,('you step out in front of your house',x,z)
 shop=page.evaluate('LRLane.STREET.shop[0]+LR.CAT.laneshop.door')
 walk_into(shop+.5,2.5,'__lr.laneVisit?.place==="shop"');page.wait_for_function('!!__lr.view.fp')
 assert page.evaluate('__lr.room.items.some(i=>i.t==="merchantcat")')

 # 4. Out of the shop's door you're back on the street, in front of the shop, not teleported home.
 page.wait_for_timeout(1600);walk_into(6.5,0.5,'__lr.laneVisit?.place==="street"');page.wait_for_function('!!__lr.view.fp')
 x,z=pos();assert shop-2<x<shop+2 and z>2.5,('outside the shop',x,z)

 # 5. Tapping the Mail Room walks you over and in.
 page.wait_for_timeout(1600);page.evaluate('id=>__lr.interact(id)',at('lanepost'));page.wait_for_function('__lr.laneVisit?.place==="mail"',timeout=20000)
 assert page.evaluate('__lr.room.items.some(i=>i.t==="morningpaper")')

 # 6. Back out, and home through your own front door: you arrive standing at it.
 page.wait_for_timeout(1600);walk_into(6.5,0.5,'__lr.laneVisit?.place==="street"')
 page.wait_for_timeout(1600);walk_into(page.evaluate('LRLane.STREET.house[0]+LR.CAT.lanehome.door')+.5,2.5,'!__lr.laneVisit');page.wait_for_function('!!__lr.view.fp')
 x,z=pos();assert abs(x-3.5)<1.2 and z<2,('home at the front door',x,z)
 assert page.evaluate('__lr.meta.current')==201 and home()==before
 assert not page.evaluate('Object.keys(localStorage).some(k=>/^lr\\.room\\.-/.test(k))'),'public places are never saved as rooms'

 # 7. A reload mid-stroll wakes you at home.
 page.keyboard.press('Escape');page.evaluate('__lr.visitLaneRoom("street")');page.wait_for_function('__lr.laneVisit?.place==="street"')
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion');assert page.evaluate('__lr.meta.current')==201 and page.evaluate('!__lr.laneVisit')
 assert not errors,errors
 print('PASS lane walk: Lane tab → street in tab order, notice board, front door opens onto the lane, walk into the shop and out onto the street, tap the Mail Room to walk in, home through the front door, home untouched, reload wakes at home')
 browser.close();server.shutdown()
