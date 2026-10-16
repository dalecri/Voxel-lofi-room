"""npm run build && python3 tests/live-weather-browser.py. Mocked location/Open-Meteo, real Settings controls."""
import functools,json
from pathlib import Path
from urllib.parse import urlparse,parse_qs
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
 context=browser.new_context(viewport={'width':390,'height':844},geolocation={'latitude':43.653226,'longitude':-79.383184},permissions=['geolocation'])
 context.add_init_script("localStorage.setItem('lr.intro','true');window.geoCalls=0;const geo=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);navigator.geolocation.getCurrentPosition=(ok,fail,opts)=>{geoCalls++;geo(ok,fail,opts)}")
 requests=[];errors=[];failure=False
 def route(r):
  if r.request.url.startswith('http://127.0.0.1:'):r.continue_()
  elif r.request.url.startswith('https://api.open-meteo.com/v1/forecast?'):
   requests.append(r.request.url);q=parse_qs(urlparse(r.request.url).query);assert q=={'latitude':['43.7'],'longitude':['-79.4'],'current':['weathercode,wind_speed_10m,temperature_2m,precipitation'],'hourly':['precipitation_probability'],'forecast_days':['2'],'timeformat':['unixtime'],'timezone':['auto']},q
   r.fulfill(status=200,headers={'access-control-allow-origin':'*'},content_type='application/json',body=json.dumps({'current':None} if failure else {'current':{'weathercode':63,'wind_speed_10m':20}}))
  else:r.abort()
 context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.liveWeather');assert not requests;assert page.evaluate('geoCalls')==0
 def settings():
  page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click()
 def live():return page.get_by_role('switch',name='Live weather',exact=True)
 page.evaluate('() => {window.weatherWind=null;__lr.Sound.soundscape=s=>{window.weatherWind=s.wind};}')
 settings();assert page.locator('#menu-settings .toggle').count()==11
 assert page.locator('#menu-settings .toggle span').evaluate_all("es=>es.every(e=>getComputedStyle(e).textAlign==='left')")
 assert page.evaluate("() => {const b=document.createElement('button');b.textContent='Base button alignment';document.querySelector('#menu-settings').appendChild(b);const left=getComputedStyle(b).textAlign==='left';b.remove();return left;}")
 page.screenshot(path='/tmp/live-weather-settings-390.png')
 live().click();page.wait_for_function("__lr.meta.liveWeather && __lr.meta.weather==='rain' && __lr.meta.weatherFetchedAt>0")
 assert page.evaluate('__lr.view.weather')=='rain';assert page.locator('body.raining').count()==1;assert live().evaluate("e=>e.classList.contains('on')");assert page.evaluate('geoCalls')==1
 page.wait_for_function('weatherWind===.5');assert page.evaluate('__lr.liveWeather.soundWind(0)')==.5
 raw=page.evaluate('localStorage.getItem("lr.meta")')
 for value in ['latitude','longitude','43.653226','-79.383184','43.7','-79.4']:assert value not in raw,value
 assert len(requests)==1;page.evaluate('__lr.liveWeather.refresh()');assert len(requests)==1
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function("__lr?.meta.liveWeather && __lr.view.weather==='rain'");page.wait_for_function('__lr.liveWeather.soundWind(0)===.5');assert len(requests)==2;assert page.evaluate('geoCalls')==1
 # Keep the cloud chip removed. Settings' Rain control supplies manual override.
 assert page.locator('#bRain').count()==0
 settings();page.locator('#menu-settings').get_by_role('switch',name='Rain',exact=True).click();assert page.evaluate('__lr.meta.liveWeather') is False;assert page.evaluate('__lr.view.weather')=='clear';assert "Live weather off — you're in charge of the sky now" in page.locator('#toasts').inner_text();page.keyboard.press('Escape')
 # Failed responses retain the last condition and successful timestamp, silently.
 old=page.evaluate('__lr.meta.weatherFetchedAt');failure=True;settings();live().click();page.wait_for_function('geoCalls===2');page.wait_for_function('n=>performance.getEntriesByType("resource").filter(e=>e.name.startsWith("https://api.open-meteo.com")).length>=n',arg=2)
 page.evaluate('__lr.liveWeather.refresh()');assert page.evaluate('__lr.meta.liveWeather');assert page.evaluate('__lr.meta.weather')=='clear';assert page.evaluate('__lr.meta.weatherFetchedAt')==old
 live().click();assert not page.evaluate('__lr.meta.liveWeather');page.keyboard.press('Escape');assert not errors,errors;context.close()
 # Permission denial updates the actual setting and gives the requested reason.
 denied=browser.new_context(viewport={'width':390,'height':844});denied.add_init_script("localStorage.setItem('lr.intro','true');Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,fail){fail({code:1})}}})")
 denied.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=denied.new_page();page.on('pageerror',lambda e:errors.append(e.stack));page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');settings();live().click();page.wait_for_function('__lr.meta.liveWeather===false');assert not live().evaluate("e=>e.classList.contains('on')");assert 'Location denied — live weather stays off' in page.locator('#toasts').inner_text();assert not errors,errors
 print('PASS: base/Settings text aligned at 390px, opt-in real geolocation mock and rounded Open-Meteo request, rain applied, live wind, persistence/boot refresh, silent failure, Settings manual override, denial resets toggle, cloud remains removed, no console errors',flush=True)
 browser.close()
server.shutdown()
