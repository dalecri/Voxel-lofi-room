"""Build www first. Native menu/search/sky composition and persistence."""
import functools
from datetime import datetime, timezone
from io import BytesIO
from PIL import Image, ImageChops
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
 context=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce',timezone_id='America/Toronto')
 context.add_init_script('''if(!localStorage.getItem('layoutFixture')){localStorage.setItem('layoutFixture','true');const r={v:1,name:'Layout room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.menuTab':'Today','lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()');page.click('#bMenu')
 clock=page.locator('.today-welcome .today-flower-clock');assert clock.count()==1;assert page.locator('.today-welcome .today-condition').count()==0
 page.clock.set_fixed_time(datetime(2026,10,20,13,30,tzinfo=timezone.utc));page.evaluate('__lr.todayUI.refresh()')
 assert clock.locator('.today-flower-hour').get_attribute('transform')=='rotate(285 40 40)';assert clock.locator('.today-flower-minute').get_attribute('transform')=='rotate(180 40 40)';assert clock.locator('.today-flower-label').inner_text()=='Morning';assert '9:30' in clock.get_attribute('aria-label');assert clock.locator('svg').get_attribute('aria-hidden')=='true'
 page.clock.set_fixed_time(datetime(2026,10,20,13,31,tzinfo=timezone.utc));page.evaluate('__lr.todayUI.refresh()');assert clock.locator('.today-flower-hour').get_attribute('transform')=='rotate(285.5 40 40)';assert clock.locator('.today-flower-minute').get_attribute('transform')=='rotate(186 40 40)'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true);__lr.todayUI.refresh()}',phase)
  assert clock.locator('.today-flower-label').inner_text()=='Morning'
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');hello=page.locator('.today-welcome h2').bounding_box();r=clock.bounding_box();assert r['x']>=hello['x']+hello['width'];assert abs(r['y']+r['height']/2-hello['y']-hello['height']/2)<1
   assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.locator('.today-welcome').screenshot(path=f'/tmp/flower-clock-{phase}-{width}.png')
 assert page.get_by_role('region',name='Weather forecast',exact=True).count()==1
 assert not errors,errors;browser.close()
server.shutdown()
print('PASS: real local clock, hour/minute angles and updates, phase-independent period, accessible time, greeting replacement, day/night phone/desktop layout, weather footer retained')
