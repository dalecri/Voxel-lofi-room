"""npm run build && python3 tests/weather-browser.py. Weather migration, tree tap and Android Settings."""
import functools,json,re
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
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
 page.evaluate("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({weather:'sakura',raining:true,realtime:false,sound:false,music:false,phase:'day'}));localStorage.removeItem('lr.found')")
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr')
 assert page.evaluate('__lr.meta.weather')=='clear'
 assert page.evaluate('__lr.view.weather')=='clear'
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.meta")).weather')=='clear'
 assert not page.evaluate('__lr.meta.raining')
 assert 'hanami' not in page.evaluate('JSON.parse(localStorage.getItem("lr.found") || "[]")')
 # A second boot reads the migrated value. Weather remains supported without a toolbar control.
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr')
 assert page.evaluate('__lr.meta.weather')=='clear'
 assert page.locator('#bRain').count()==0
 assert page.evaluate('LRWeather.STATES')==['clear','rain','storm','snow']
 for expected in ['rain','storm','snow','clear']:
  page.evaluate("w=>{__lr.meta.weather=w;__lr.meta.raining=w==='rain'||w==='storm';localStorage.setItem('lr.meta',JSON.stringify(__lr.meta))}",expected)
  page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr')
  assert page.evaluate('__lr.meta.weather')==expected
  assert page.evaluate('__lr.view.weather')==expected
  assert page.locator('#bRain').count()==0
 assert 'hanami' not in page.evaluate('JSON.parse(localStorage.getItem("lr.found") || "[]")')
 page.click('#bHome');assert 'Clear' in page.locator('#homeView').inner_text();page.keyboard.press('Escape')
 # Actual tree interaction still bursts petals and discovers Hanami.
 result=page.evaluate('''() => {const a=__lr,C=LR.CAT.sakura;a.room.items=[];a.room.n=10;a.setMode('explore',true);const it=a.room.make('sakura',{x:4,z:4});a.room.add(it);a.changed();let burst=null;const original=a.view.burst;a.view.burst=function(id,kind,n){burst={id,kind,n};return original.call(this,id,kind,n)};try{a.interact(it.id)}finally{a.view.burst=original}return {tap:C.tap,petals:C.petals,burst,found:JSON.parse(localStorage.getItem('lr.found'))};}''')
 assert result['tap']=='petals' and result['petals']
 assert result['burst']['kind']=='petals' and result['burst']['n']==3
 assert 'hanami' in result['found']
 # Wrapped Settings button labels must explicitly align left on Android widths, both themes.
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.meta.realtime=false;__lr.meta.dreamy=false;__lr.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click()
   assert page.locator('#menu-settings .toggle').count()==12
   assert page.locator('#menu-settings .toggle span').evaluate_all("es=>es.every(e=>getComputedStyle(e).textAlign==='left')")
   assert page.locator('#menu-settings p').evaluate_all("es=>es.every(e=>getComputedStyle(e).textAlign==='left')")
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if width==390:page.screenshot(path=f'/tmp/settings-left-{phase}.png')
   if phase=='day' and width==390:
    b=page.get_by_role('switch',name='Cat mischief',exact=False);before=b.get_attribute('class');b.click();assert page.get_by_role('switch',name='Cat mischief',exact=False).get_attribute('class')!=before
   page.keyboard.press('Escape');assert not page.locator('#sheet').evaluate("e=>e.classList.contains('open')")
 assert not errors,errors
 print('PASS: persisted sakura migration, four background weather states, no weather toolbar button, Home weather, untouched tree petal burst/Hanami, left-aligned working Settings at Android/mobile/desktop day/night, no console errors',flush=True)
 browser.close()
server.shutdown()
