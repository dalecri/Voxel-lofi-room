"""Public room visits, services, purchases and private home save isolation."""
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
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.characterFixture){localStorage.characterFixture='1';const base={v:1,n:10,wall:{style:'paint',color:0},floor:{style:'oak'},next:4};const a={...base,name:'Character home',items:[{id:1,t:'roomdoor',k:0,u:3,e:0,c:0,r:0,link:102},{id:2,t:'desk',x:2,z:5,c:0,r:0},{id:3,t:'roomgate',x:7,z:7,c:0,r:0}]},b={...base,name:'Cat home',items:[{id:1,t:'roomdoor',k:0,u:3,e:0,c:0,r:0,link:101},{id:2,t:'cat',x:6,z:6,c:0,r:0}]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:a.name,n:2},{id:102,name:b.name,n:2}],'lr.room.101':a,'lr.room.102':b,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.add_init_script('localStorage.setItem("lr.fireflies","10000")')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion');assert page.evaluate('__lr.room.items.some(i=>i.t==="cat")') is False

 home=page.evaluate('JSON.stringify(__lr.room.serialize())');current=page.evaluate('__lr.meta.current');saved=page.evaluate('localStorage.getItem("lr.room."+__lr.meta.current)')
 page.click('#bLane');page.locator('.lane-front[data-place=shop]').click();page.wait_for_function('__lr.laneVisit?.place==="shop"');assert page.locator('#laneVisitBar').is_visible()
 page.click('#bLane');page.locator('.lane-front[data-place=house]').click();assert page.locator('#lane-house .rooms-card').count()==2;assert page.locator('#lane-house .rooms-card[data-room-id="-101"]').count()==0;assert 'visiting Mallow' in page.locator('.lane-location').inner_text();page.keyboard.press('Escape')
 assert page.evaluate('__lr.room.items.some(i=>i.t==="merchantcat")');assert page.evaluate('JSON.parse(localStorage.getItem("lr.meta")).current')==current
 page.evaluate('__lr.interact(__lr.room.items.find(i=>i.t==="merchantcat").id)');page.locator('.lane-keeper').wait_for();assert page.locator('.lane-shelf').count()==1
 item=page.locator('.lane-item').first.get_attribute('data-item');balance=page.evaluate('__lr.shop.balance');page.locator('.lane-item').first.get_by_role('button').click();assert page.evaluate('id=>__lr.shop.owns(id)',item);assert page.evaluate('__lr.shop.balance')<balance;page.keyboard.press('Escape')
 page.click('#bCharacter');assert page.evaluate('!!__lr.view.fp');page.keyboard.press('Escape');page.get_by_role('button',name='← Back home',exact=True).click();assert page.evaluate('!__lr.laneVisit');assert page.evaluate('JSON.stringify(__lr.room.serialize())')==home
 page.evaluate('__lr.visitLaneRoom("mail")');page.wait_for_function('__lr.laneVisit?.place==="mail"');page.evaluate('__lr.interact(__lr.room.items.find(i=>i.t==="morningpaper").id)');page.get_by_role('heading',name='Papers',exact=True).wait_for();page.keyboard.press('Escape')
 page.evaluate('__lr.interact(__lr.room.items.find(i=>i.t==="letterbox").id)');page.get_by_role('heading',name='Letters to future you',exact=True).wait_for();page.keyboard.press('Escape')
 page.screenshot(path='/tmp/mail-room-visit.png');page.evaluate('__lr.interact(Number(Object.keys(__lr.laneVisit.actions).find(id=>__lr.laneVisit.actions[id]==="home")))');assert page.evaluate('__lr.meta.current')==current
 assert page.evaluate('()=>{const r=new LR.Room();r.load(JSON.parse(localStorage.getItem("lr.room."+__lr.meta.current)));return JSON.stringify(r.serialize())}')==home
 assert not page.evaluate('Object.keys(localStorage).some(k=>k==="lr.room.-101"||k==="lr.room.-102")')
 page.evaluate('__lr.visitLaneRoom("shop")');page.wait_for_function('__lr.laneVisit?.place==="shop"');page.click('#bCharacter');page.evaluate('()=>{__lr.companion.takeControl({x:6.5,z:.5,heading:Math.PI});__lr.view.fp.yaw=Math.PI;__lr.view.fp.look=0}');page.keyboard.down('w');page.wait_for_function('!__lr.laneVisit');page.keyboard.up('w');assert page.evaluate('!!__lr.view.fp');page.keyboard.press('Escape')
 page.evaluate('__lr.visitLaneRoom("shop")');page.wait_for_function('__lr.laneVisit?.place==="shop"');page.reload(wait_until="networkidle");page.wait_for_function('!!__lr');assert page.evaluate('__lr.meta.current')==current;assert page.evaluate('!__lr.laneVisit')
 assert not errors,errors
 browser.close();server.shutdown()
