"""npm run build && python3 tests/radio-badge-browser.py. Journal without duplicate daily controls and miniature radio controls."""
import functools,json
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
 context.add_init_script('''if(!sessionStorage.houseFixture){sessionStorage.houseFixture='true';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.draft':{id:102,base:'',data:{...b,name:'Living draft restored'}},'lr.mainBedroom':101,'lr.meta':{current:102,visitors:false,realtime:false,dreamy:false,phase:'day',stations:[{name:'Old station',url:'https://example.com/old.mp3'}]}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 context.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','exportedAt':'','clips':[]}))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 assert page.evaluate('__lr.meta.current')==101;assert page.evaluate('JSON.parse(localStorage.getItem("lr.room.102")).name')=='Living draft restored'
 menu('Today');assert page.locator('#menu-today .daily-notice').count()==0;assert page.locator('#menu-today .today-got').is_visible()
 page.get_by_role('tab',name='Journal',exact=True).click();assert page.locator('#menu-journal .daily-notice,#menu-journal .journal-streak').count()==0;assert page.locator('#bMomentDiary').is_visible();assert page.locator('#bCatDiary').is_visible();esc()
 def set_icon(name,icon):
  page.get_by_role('button',name='Edit icon for '+name,exact=True).click();page.get_by_role('button',name='Use '+icon+' for '+name,exact=True).click()
 page.evaluate("HTMLMediaElement.prototype.play=function(){return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){}")
 # One receiver follows the selected channel, wraps, and keeps the controls focused.
 menu('Sound');assert page.locator('.station-card .station-icon-label,.station-card select').count()==0;assert page.locator('.station-card').count()==1;assert page.locator('.station-copy b').inner_text()=='Lofi radio';page.locator('.station-copy').focus();page.keyboard.press('Enter');assert page.locator('.station-copy').get_attribute('aria-expanded')=='true';page.get_by_role('button',name='Use 🌊 for Lofi radio',exact=True).click();assert page.evaluate('__lr.meta.lofiIcon')=='🌊';assert page.locator('.station-copy').evaluate('e=>e===document.activeElement')
 page.locator('.station-next').click();assert page.evaluate('__lr.meta.music && __lr.meta.station===1');assert page.locator('.station-next').evaluate('e=>e===document.activeElement');assert page.locator('.station-copy b').inner_text()=='Old station'
 set_icon('Old station','🌙');assert page.locator('.station-dial').inner_text()=='🌙'
 disclosure=page.locator('.station-add-disclosure');assert disclosure.locator('.station-add-toggle').get_attribute('aria-expanded')=='false';assert not page.locator('#stName').is_visible();disclosure.locator('.station-add-toggle').focus();page.keyboard.press('Enter');assert page.locator('#stName').is_visible()
 page.locator('#stName').fill('Night garden');page.locator('#stUrl').fill('https://example.com/night.mp3');assert page.get_by_role('combobox',name='New station icon',exact=True).count()==0;page.locator('#stUrl').press('Enter');assert page.locator('.station-card').count()==1;assert page.locator('.station-add-toggle').get_attribute('aria-expanded')=='false';assert page.locator('.station-add-toggle').evaluate('e=>e===document.activeElement');auto_icon=page.evaluate('__lr.meta.stations.at(-1).icon');assert auto_icon in ['📻','🌙','☕','🌧','🌿','🎷','🎹','🌊','🌸','✨','🎧','🔥'];assert page.evaluate('JSON.parse(localStorage.getItem("lr.meta")).stations.at(-1).icon')==auto_icon
 page.get_by_role('button',name='Stop Old station',exact=True).click();assert not page.evaluate('__lr.meta.music');assert page.locator('.station-copy b').inner_text()=='Old station'
 page.locator('.station-prev').click();assert page.evaluate('__lr.meta.station===0');page.get_by_role('button',name='Stop Lofi radio',exact=True).click();page.get_by_role('button',name='Play Lofi radio',exact=True).click();assert page.locator('.station-card.playing').count()==1
 page.get_by_role('button',name='Play Lofi radio',exact=True).click();assert page.evaluate('__lr.meta.music');page.get_by_role('button',name='Pause Lofi radio',exact=True).click();assert not page.evaluate('__lr.meta.music');assert page.locator('.station-play').evaluate('e=>e===document.activeElement');page.get_by_role('button',name='Play Lofi radio',exact=True).click()
 page.locator('.station-next').click();page.locator('.station-next').click();assert page.locator('.station-copy b').inner_text()=='Night garden';assert page.locator('.station-dial').inner_text()==auto_icon;set_icon('Night garden','🌿');assert page.locator('.station-dial').inner_text()=='🌿'
 page.locator('.station-next').click();assert page.evaluate('__lr.meta.station===0');page.locator('.station-prev').click();assert page.evaluate('__lr.meta.station===2');assert page.locator('.station-card').count()==1
 page.get_by_role('button',name='Stop Night garden',exact=True).click();assert page.locator('.station-copy b').inner_text()=='Night garden'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase);assert page.locator('body').evaluate("(e,p)=>e.classList.contains('night')===(p==='night')",phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.locator('.station-card').first.scroll_into_view_if_needed();assert page.locator('.station-controls').evaluate('e=>[...e.children].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44})');assert page.locator('.station-waveform svg').is_visible();page.screenshot(path=f'/tmp/radio-cards-{phase}-{width}.png');page.locator('.station-add-toggle').click();page.locator('.addstation').scroll_into_view_if_needed();assert page.get_by_role('textbox',name='Station name',exact=True).count()==1;assert page.get_by_role('textbox',name='Stream link',exact=True).count()==1;assert page.locator('.addstation').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/station-add-{phase}-{width}.png');assert page.locator('.station-field').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect(),i=e.querySelector("input").getBoundingClientRect();return i.top>=r.top+18 && i.right<=r.right+1})');page.locator('.station-add-toggle').click();assert not page.locator('#stName').is_visible();assert page.locator('.station-add-toggle').bounding_box()['height']<=52;page.screenshot(path=f'/tmp/station-add-collapsed-{phase}-{width}.png')
 esc();page.reload(wait_until='networkidle');ready();menu('Sound');assert page.locator('.station-card').count()==1;assert page.locator('.station-copy b').inner_text()=='Night garden';assert page.locator('.station-dial').inner_text()=='🌿'
 page.evaluate("HTMLMediaElement.prototype.play=function(){return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){}")
 page.locator('.station-prev').click();assert page.locator('.station-dial').inner_text()=='🌙';page.get_by_role('button',name='Remove',exact=True).click();assert page.locator('.station-copy b').inner_text()=='Lofi radio';assert page.evaluate('__lr.meta.stations.length')==1
 page.locator('.station-next').click();page.get_by_role('button',name='Remove',exact=True).click();assert page.locator('.station-card').count()==1;assert page.evaluate('__lr.meta.stations.length')==0;assert page.locator('.station-prev').is_disabled();assert page.locator('.station-next').is_disabled();esc()
 assert not errors,errors
 print('PASS one radio, next/previous wrap and focus, play/stop, selected channel/icon persistence, removal, single-channel controls, Journal without duplicate daily controls, mobile/day/night',flush=True)
 browser.close()
server.shutdown()
