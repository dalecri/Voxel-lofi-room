"""npm run build && python3 tests/village-browser.py. Diorama grid is the only Rooms layout."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script('''if(!sessionStorage.roomsFixture){sessionStorage.roomsFixture='true';const rows=[{id:101,name:'Little bedroom',floorLevel:'Upstairs'},{id:102,name:'Tea room',floorLevel:'Ground floor'},{id:103,name:'Reading nook',floorLevel:'Upstairs'}];
 for(const [k,v] of Object.entries({'lr.roomsView':'showcase','lr.intro':true,'lr.rooms':rows,'lr.meta':{current:101,realtime:false,phase:'day',visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));
 for(let i=0;i<rows.length;i++){const r={v:1,name:rows[i].name,n:10,wall:{style:'paint',color:i},floor:{style:'oak'},items:[]};localStorage.setItem('lr.room.'+rows[i].id,JSON.stringify(r));}}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.view')
 # Distinct real decor proves previews capture each room, rather than the scene
 # that happened to be on the canvas just before a room switch.
 page.evaluate('''()=>{const a=__lr;for(const [id,type] of [[101,'bed'],[102,'armchair'],[103,'floorlamp']]){const r=new LR.Room();r.load(JSON.parse(localStorage.getItem('lr.room.'+id)));r.add(r.make(type,{x:3,z:3,on:true}));localStorage.setItem('lr.room.'+id,JSON.stringify(r.serialize()));}a.room.load(JSON.parse(localStorage.getItem('lr.room.101')));a.changed();}''')
 def menu():
  page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click()
 def travel(id):
  page.locator(f'.rooms-grid [data-room-id="{id}"] .rooms-visit').click();page.wait_for_function('id=>__lr.meta.current===id',arg=id)
 menu();assert page.locator('.rooms-card').count()==3;assert page.locator('.village-map').count()==0
 assert page.locator('.rooms-switcher,.rooms-blueprint,.rooms-showcase').count()==0
 assert page.locator('.rooms-views').get_attribute('data-view')=='grid'
 page.wait_for_function('document.querySelector(".rooms-card.here img")?.naturalWidth>0')
 # Unsaved historic rooms invite a visit instead of inventing a preview. Visiting
 # and leaving saves the real renderer PNG, shared with the room picker.
 assert page.locator('[data-room-id="102"] .rooms-preview-hint').count()==1
 travel(102);menu();travel(103);menu();travel(101);menu()
 page.wait_for_function('[...document.querySelectorAll(".rooms-grid img")].every(i=>i.naturalWidth>0)')
 assert page.evaluate('Object.keys(JSON.parse(localStorage.getItem("lr.roomSnapshots"))).length')==3
 assert page.evaluate('''() => {const v=__lr.view,s=()=>JSON.stringify([v.phase,v.phaseT,v.ph,v.pool.map(l=>l.intensity),v.sun.color.getHex(),v.sun.intensity,v.r.toneMappingExposure,v.env,v.sky]),before=s();const day=v.snapshot(120,'day'),night=v.snapshot(120,'night');if(before!==s())throw Error('Snapshot altered live lighting');return day!==night && JSON.parse(localStorage.getItem('lr.roomSnapshots'))['102'].shots.day!==JSON.parse(localStorage.getItem('lr.roomSnapshots'))['102'].shots.night;}''')
 assert page.evaluate('''()=>{const c=JSON.parse(localStorage.getItem('lr.roomSnapshots'));return Object.values(c).every(e=>Object.keys(e.shots).length===4) && new Set(Object.values(c).map(e=>e.shots.day)).size===3;}''')
 assert page.locator('.rooms-bedroom').count()==3;assert page.get_by_role('combobox',name='Main bedroom',exact=True).count()==0
 # Shared spotlight filters every view without introducing another input.
 page.get_by_role('button',name='Search your space',exact=True).click()
 search=page.get_by_role('searchbox',name='Search furniture, letters, scenes, ideas',exact=True)
 search.fill('Tea room');assert page.locator('.rooms-card').count()==1;assert page.locator('.rooms-card').get_attribute('data-room-id')=='102'
 page.keyboard.press('Escape');assert page.locator('.rooms-card').count()==3
 travel(102);menu();assert page.locator('.rooms-views').get_attribute('data-view')=='grid'
 for legacy in ['map','showcase']:
  page.keyboard.press('Escape');page.evaluate('v=>localStorage.setItem("lr.roomsView",JSON.stringify(v))',legacy);page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');menu();assert page.locator('.rooms-views').get_attribute('data-view')=='grid';assert page.locator('.rooms-switcher,.rooms-blueprint,.rooms-showcase').count()==0
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.locator('.rooms-content').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
   if width<600:assert page.locator('.rooms-grid').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')==2
   if width==390:page.locator('.rooms-views').scroll_into_view_if_needed();page.screenshot(path=f'/tmp/rooms-grid-{phase}.png')
 page.keyboard.press('Escape');menu();page.locator('.rooms-new').click();assert page.locator('details').count()>0
 # Snapshot caches are private; room serialization is unchanged.
 decoded=page.evaluate('async()=>__lr.readCode(await __lr.roomCode())');assert 'roomSnapshots' not in str(decoded);assert 'roomsView' not in str(decoded)
 assert not errors,errors
 print('PASS: grid only, saved real PNGs, lazy preview loading, shared search, travel, retired preference ignored, bedroom picker, new-room flow, day/night mobile/desktop and no console errors',flush=True)
 browser.close()
server.shutdown()
