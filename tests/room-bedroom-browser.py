"""Room-card stars select, clear, persist and save a draft as the startup bedroom."""
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
 c=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
 c.add_init_script('''if(!localStorage.getItem('bedroomFixture')){localStorage.setItem('bedroomFixture','true');const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.meta':{current:101,phase:'day',music:false,sound:false,realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()')
 def rooms():page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click()
 def star(id):return page.locator(f'.rooms-card[data-room-id="{id}"] .rooms-bedroom')
 rooms();assert page.get_by_role('combobox',name='Main bedroom',exact=True).count()==0;assert page.locator('.rooms-bedroom').count()==2
 star(102).click();assert page.evaluate('__lr.meta.current')==101;assert star(102).get_attribute('aria-pressed')=='true';assert star(102).evaluate('e=>e===document.activeElement');assert star(102).locator('svg').get_attribute('fill')=='currentColor';assert page.evaluate('JSON.parse(localStorage.getItem("lr.mainBedroom"))')==102
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');assert page.evaluate('__lr.meta.current')==102
 rooms();star(101).focus();page.keyboard.press('Space');assert page.evaluate('__lr.meta.current')==102;assert star(101).get_attribute('aria-pressed')=='true';assert star(102).get_attribute('aria-pressed')=='false'
 star(101).click();assert page.evaluate('localStorage.getItem("lr.mainBedroom")') is None;page.keyboard.press('Escape');page.evaluate('window.dispatchEvent(new Event("pagehide"))');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');assert page.evaluate('__lr.meta.current')==102
 # A star on a new room saves it through the existing flow before choosing it.
 page.click('#bSurprise');draft=page.evaluate('__lr.meta.current');assert not page.evaluate('id=>__lr.rooms.some(r=>r.id===id)',draft);rooms();star(draft).click();assert page.evaluate('id=>__lr.rooms.some(r=>r.id===id)',draft);assert page.evaluate('id=>!!JSON.parse(localStorage.getItem("lr.room."+id))',draft);assert star(draft).get_attribute('aria-pressed')=='true';assert not page.locator('#bSave').is_visible();assert '3 rooms' in page.locator('#menu-rooms h2').first.inner_text();assert star(draft).evaluate('e=>e===document.activeElement')
 for phase in ['day','night']:
  page.evaluate('p=>__lr.setPhase(p,true)',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});assert star(draft).evaluate('e=>{const b=e.getBoundingClientRect(),c=e.closest("article").getBoundingClientRect();return b.width>=44&&b.height>=44&&b.left>=c.left&&b.right<=c.right}');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');star(draft).scroll_into_view_if_needed();page.screenshot(path=f'/tmp/bedroom-star-{phase}-{width}.png')
 decoded=page.evaluate('async()=>__lr.readCode(await __lr.roomCode())');assert 'mainBedroom' not in str(decoded)
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');assert page.evaluate('__lr.meta.current')==draft
 assert not errors,errors;browser.close()
server.shutdown();print('PASS: card star selection/clearing, no accidental travel, keyboard/focus, saved and draft startup, privacy, day/night mobile/desktop')
