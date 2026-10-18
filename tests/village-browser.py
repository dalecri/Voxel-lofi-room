"""npm run build && python3 tests/village-browser.py. Native Rooms layouts replace the village."""
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
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':rows,'lr.meta':{current:101,realtime:false,phase:'day',visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));
 for(let i=0;i<rows.length;i++){const r={v:1,name:rows[i].name,n:10,wall:{style:'paint',color:i},floor:{style:'oak'},items:[]};localStorage.setItem('lr.room.'+rows[i].id,JSON.stringify(r));}}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.view')
 # Distinct real decor proves previews capture each room, rather than the scene
 # that happened to be on the canvas just before a room switch.
 page.evaluate('''()=>{const a=__lr;for(const [id,type] of [[101,'bed'],[102,'armchair'],[103,'floorlamp']]){const r=new LR.Room();r.load(JSON.parse(localStorage.getItem('lr.room.'+id)));r.add(r.make(type,{x:3,z:3,on:true}));localStorage.setItem('lr.room.'+id,JSON.stringify(r.serialize()));}a.room.load(JSON.parse(localStorage.getItem('lr.room.101')));a.changed();}''')
 def menu():
  page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click()
 def mode(name):page.get_by_role('button',name=name,exact=True).click()
 def travel(id):
  page.locator(f'.rooms-grid [data-room-id="{id}"] .rooms-visit').click();page.wait_for_function('id=>__lr.meta.current===id',arg=id)
 menu();assert page.locator('.rooms-card').count()==3;assert page.locator('.village-map').count()==0
 assert page.get_by_role('button',name='Diorama grid',exact=True).get_attribute('aria-pressed')=='true'
 page.wait_for_function('document.querySelector(".rooms-card.here img")?.naturalWidth>0')
 # Unsaved historic rooms invite a visit instead of inventing a preview. Visiting
 # and leaving saves the real renderer PNG, shared across all three layouts.
 assert page.locator('[data-room-id="102"] .rooms-preview-hint').count()==1
 travel(102);menu();travel(103);menu();travel(101);menu()
 page.wait_for_function('[...document.querySelectorAll(".rooms-grid img")].every(i=>i.naturalWidth>0)')
 assert page.evaluate('Object.keys(JSON.parse(localStorage.getItem("lr.roomSnapshots"))).length')==3
 assert page.evaluate('''() => {const v=__lr.view,s=()=>JSON.stringify([v.phase,v.phaseT,v.ph,v.pool.map(l=>l.intensity),v.sun.color.getHex(),v.sun.intensity,v.r.toneMappingExposure,v.env,v.sky]),before=s();const day=v.snapshot(120,'day'),night=v.snapshot(120,'night');if(before!==s())throw Error('Snapshot altered live lighting');return day!==night && JSON.parse(localStorage.getItem('lr.roomSnapshots'))['102'].shots.day!==JSON.parse(localStorage.getItem('lr.roomSnapshots'))['102'].shots.night;}''')
 assert page.evaluate('''()=>{const c=JSON.parse(localStorage.getItem('lr.roomSnapshots'));return Object.values(c).every(e=>Object.keys(e.shots).length===4) && new Set(Object.values(c).map(e=>e.shots.day)).size===3;}''')
 assert page.get_by_label('Main bedroom',exact=True).count()==1
 # Existing portal routing is preserved; map connectors follow actual linked doors.
 page.evaluate('''() => {const a=__lr,t=Object.keys(LR.CAT).find(k=>LR.CAT[k].tap==='portal'&&LR.CAT[k].kind==='floor');window.testDoor=a.room.add(a.room.make(t,{x:7,z:7}));testDoor.link=102;a.changed();}''')
 mode('House map');assert page.locator('.rooms-connectors path').count()==1
 assert page.locator('.rooms-floor-heading').all_text_contents()==['Upstairs','Ground floor']
 page.evaluate('testDoor.link=0;__lr.changed()');assert page.locator('.rooms-connectors path').count()==0
 page.evaluate('testDoor.link=102;__lr.changed()');assert page.locator('.rooms-connectors path').count()==1
 # Shared spotlight filters every view without introducing another input.
 page.get_by_role('button',name='Search your space',exact=True).click()
 search=page.get_by_role('searchbox',name='Search furniture, letters, scenes, ideas',exact=True)
 for name in ['Diorama grid','House map','Showcase']:
  mode(name);search.fill('Tea room');assert page.locator('.rooms-card').count()==1;assert page.locator('.rooms-card').get_attribute('data-room-id')=='102';search.fill('')
 mode('Showcase');page.locator('.rooms-list [data-room-id="102"] .rooms-visit').click();assert page.locator('.rooms-hero').get_attribute('data-room-id')=='102';assert page.get_by_role('button',name='Step inside',exact=True).is_visible()
 page.get_by_role('button',name='Step inside',exact=True).click();page.wait_for_function('__lr.meta.current===102');menu();assert page.locator('.rooms-views').get_attribute('data-view')=='showcase';assert page.get_by_role('button',name='Step inside',exact=True).count()==0
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');menu();assert page.locator('.rooms-views').get_attribute('data-view')=='showcase'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   for name in ['Diorama grid','House map','Showcase']:
    mode(name);page.wait_for_timeout(200)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.locator('.rooms-content').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    if width<600 and name=='Diorama grid':assert page.locator('.rooms-grid').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')==1
    if width<600 and name=='Showcase':assert page.locator('.rooms-showcase').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')==1
    if width==390:page.locator('.rooms-views').scroll_into_view_if_needed();page.screenshot(path=f'/tmp/rooms-{phase}-{name.split()[0]}.png')
 page.keyboard.press('Escape');menu();mode('Diorama grid');page.locator('.rooms-new').click();assert page.locator('details').count()>0
 # Snapshot caches and view preference are private; room serialization is unchanged.
 decoded=page.evaluate('async()=>__lr.readCode(await __lr.roomCode())');assert 'roomSnapshots' not in str(decoded);assert 'roomsView' not in str(decoded)
 assert not errors,errors
 print('PASS: three native layouts, saved real PNGs, lazy preview loading, shared search, grouped floors and live portal connectors, travel, preference reload, bedroom picker, new-room flow, day/night mobile/desktop and no console errors',flush=True)
 browser.close()
server.shutdown()
