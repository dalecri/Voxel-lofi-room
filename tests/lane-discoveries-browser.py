"""npm run build && python3 tests/lane-discoveries-browser.py. Little daily discoveries on the Lane, on fixed dates:
a letter on the doorstep (kept in the Mail Room), a misplaced parcel carried to its neighbour, a visitor who gives an
unusual piece of furniture, and the next day a flower that blooms for a few Fireflies. Two or three a day."""
import functools,json,datetime
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
FIXTURE='''if(!localStorage.dFixture){localStorage.dFixture='1';const home={v:1,n:10,name:'Home',wall:{style:'paint',color:0},floor:{style:'oak'},next:2,items:[{id:1,t:'desk',x:6,z:6,c:0,r:0}]};
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.fireflies':30,'lr.rooms':[{id:401,name:home.name,n:1}],'lr.room.401':home,'lr.meta':{current:401,phase:'day',weather:'clear',realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');context.add_init_script(FIXTURE)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.clock.set_fixed_time(datetime.datetime(2026,11,8,13,0))   # a Sunday afternoon: a parcel, a letter and a visitor
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 finds=lambda:page.evaluate('__lr.room.items.filter(i=>/^find:/.test(__lr.laneVisit?.actions[i.id]||"")).map(i=>i.t).sort()')
 def tap(t):page.evaluate('t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id)',t)
 sheet=page.locator('#sheetBody')

 # The Lane menu says how many little things are waiting.
 page.click('#bLane');assert '3 little things to find' in page.locator('.lane-finds').inner_text(),page.locator('.lane-finds').inner_text()
 page.locator('.lane-walk').click();page.wait_for_function('__lr.laneVisit?.place==="street"')
 got=finds();assert 'laneletter' in got and 'laneparcel' in got and 'lanevisitor' in got and len(got)==4,got   # + the visitor's piece

 # A letter on the doorstep: it opens, leaves the street, and is kept in the Mail Room.
 tap('laneletter');sheet.locator('.lane-letter').first.wait_for();page.keyboard.press('Escape')
 assert 'laneletter' not in finds()

 # A parcel left at the wrong door: pick it up, then hand it to Juniper (reading under the tree) in a chat.
 tap('laneparcel');sheet.get_by_text('Juniper').first.wait_for();sheet.get_by_role('button',name='Pick it up').click()
 page.wait_for_function('!__lr.room.items.some(i=>i.t==="laneparcel")')
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.lane")).day.carrying')=='2026-11-08:parcel'
 # Mallow would take it too, but Juniper is right here.
 page.evaluate('__lr.visitLaneRoom("shop")');page.wait_for_function('__lr.laneVisit?.place==="shop"')
 page.get_by_role('button',name='Chat with Mallow',exact=True).click();sheet.get_by_role('button',name='Leave Juniper’s parcel with Mallow').wait_for();page.keyboard.press('Escape')
 page.get_by_role('button',name='← The lane',exact=True).click();page.wait_for_function('__lr.laneVisit?.place==="street"')
 before=page.evaluate('__lr.shop.balance');tap('lanereader')
 sheet.get_by_role('button',name='Hand over the parcel').click();sheet.get_by_text('I owe you a chapter').wait_for()
 assert page.evaluate('__lr.shop.balance')>before,'a delivery earns a few Fireflies'
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.lane")).day.carrying') is None
 page.keyboard.press('Escape');assert 'laneparcel' not in finds()

 # A visitor with an unusual piece: give it a home and it's yours, free.
 item=page.evaluate('__lr.room.items.find(i=>__lr.laneVisit.actions[i.id]==="find:2026-11-08:visitor"&&i.t!=="lanevisitor").t')
 shopId=page.evaluate('t=>LRShop.allCatalog.find(i=>i.piece===t).id',item);assert not page.evaluate('id=>__lr.shop.owns(id)',shopId)
 bal=page.evaluate('__lr.shop.balance');tap('lanevisitor');sheet.get_by_role('button',name='Give it a home').click()
 page.wait_for_function('id=>__lr.shop.owns(id)',arg=shopId);assert page.evaluate('__lr.shop.balance')==bal,'gifts are free'
 assert finds()==['lanevisitor'],finds();page.keyboard.press('Escape')
 tap('lanevisitor');sheet.get_by_text('on my way').wait_for();page.keyboard.press('Escape')

 # All found: the menu says so, and the letter waits in the Mail Room.
 page.get_by_role('button',name='← Home',exact=True).click();page.wait_for_function('!__lr.laneVisit')
 page.click('#bLane');assert 'found all 3' in page.locator('.lane-finds').inner_text()
 page.evaluate('__lr.visitLaneRoom("mail")');page.wait_for_function('__lr.laneVisit?.place==="mail"')
 page.evaluate('__lr.interact(__lr.room.items.find(i=>i.t==="morningpaper").id)');sheet.get_by_role('heading',name='Found on the lane').wait_for()
 page.keyboard.press('Escape');page.evaluate('__lr.returnFromLane()')

 # The next day: fresh finds, including a flower on the green worth a couple of Fireflies (once).
 page.clock.set_fixed_time(datetime.datetime(2026,11,9,13,0));page.evaluate('__lr.visitLaneRoom("street")');page.wait_for_function('__lr.laneVisit?.place==="street"')
 got=finds();assert 'lanebloom' in got and 'lanevisitor' not in got,got
 bal=page.evaluate('__lr.shop.balance');tap('lanebloom');page.wait_for_function('b=>__lr.shop.balance>b',arg=bal);after=page.evaluate('__lr.shop.balance')
 assert page.evaluate('!__lr.room.items.find(i=>i.t==="lanebloom").on'),'the sparkle goes once found; the flower stays'
 tap('lanebloom');page.wait_for_timeout(300);assert page.evaluate('__lr.shop.balance')==after
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.lane")).day.date')=='2026-11-09'
 page.evaluate('__lr.returnFromLane()')
 assert 'lr.lane' not in json.dumps(page.evaluate('async()=>__lr.readCode(await __lr.roomCode())'))
 assert not errors,errors
 print('PASS lane discoveries: menu count, letter kept in the Mail Room, parcel carried to Juniper (Mallow offers to hold it) for Fireflies, a visitor’s free gift, all-found note, next day’s bloom pays once')
 browser.close();server.shutdown()
