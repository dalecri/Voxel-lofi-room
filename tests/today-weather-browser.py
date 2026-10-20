"""Build www first. Native menu/search/sky composition and persistence."""
import functools
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
 context=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.getItem('layoutFixture')){localStorage.setItem('layoutFixture','true');const r={v:1,name:'Layout room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.menuTab':'Today','lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()');page.click('#bMenu')
 card=page.get_by_role('region',name='Weather forecast',exact=True)
 assert card.is_visible();assert card.locator('li').count()==5
 assert card.evaluate('e=>e===e.parentElement.lastElementChild')
 assert card.locator('.today-forecast-temperature').inner_text()=='—°';assert card.locator('.today-forecast-note').inner_text()=='Live weather off'
 page.evaluate("""()=>{const now=new Date(),forecast=Array.from({length:7},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12);return {date:[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),low:i-2,high:i+18,condition:['clear','rain','storm','snow'][i%4]}});Object.assign(__lr.meta,{liveWeather:true,weather:'clear',weatherFetchedAt:Date.now(),weatherDetails:{temperature:24.3,forecast}});__lr.todayUI.refresh()}""")
 assert card.locator('.today-forecast-temperature').inner_text()=='24°';assert card.locator('.today-forecast-note').inner_text()=='Local weather'
 assert card.locator('.today-forecast-low').all_text_contents()==['-2','-1','0','1','2'];assert card.locator('.today-forecast-high').all_text_contents()==['18','19','20','21','22']
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true);__lr.todayUI.refresh()}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});card.scroll_into_view_if_needed();assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');assert card.evaluate('e=>e.scrollWidth<=e.clientWidth')
   left=card.locator('.today-forecast-current').bounding_box();right=card.locator('.today-forecast-list').bounding_box();assert right['x']>=left['x']+left['width'];assert abs(left['y']-right['y'])<1
   card.screenshot(path=f'/tmp/today-weather-{phase}-{width}.png')
 page.evaluate('__lr.meta.weatherFetchedAt=Date.now()-7200000;__lr.todayUI.refresh()');assert card.locator('.today-forecast-note').inner_text()=='Cached forecast'
 page.evaluate('__lr.meta.liveWeather=false;__lr.todayUI.refresh()');assert card.locator('.today-forecast-temperature').inner_text()=='—°';assert card.locator('.today-forecast-high').all_text_contents()==['—']*5
 page.evaluate('__lr.meta.liveWeather=true;__lr.meta.weatherDetails=null;__lr.todayUI.refresh()');assert card.locator('.today-forecast-note').inner_text()=='Forecast unavailable'
 assert not errors,errors;browser.close()
server.shutdown()
print('PASS: bottom weather card, existing live/cached forecast, honest disabled/unavailable states, five civil days, day/night at 320/390/1280 with no overflow or errors')
