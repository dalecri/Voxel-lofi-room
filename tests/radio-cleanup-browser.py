"""Build www first. Radio shortcut and all native selects share the app theme."""
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
 c=browser.new_context(viewport={'width':390,'height':1000},reduced_motion='reduce')
 c.add_init_script('''if(!localStorage.getItem('radioFixture')){localStorage.setItem('radioFixture','true');const r={v:1,name:'Radio room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.meta':{current:101,phase:'day',music:false,sound:false,realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()');page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click();assert page.locator('.today-sky-tag').count()==0;assert 'chosen by you' not in page.locator('.today-sky').inner_text()
 page.get_by_role('tab',name='Sound',exact=True).click();sound=page.locator('#menu-sound');assert sound.locator(':scope > .stations').count()==1;assert sound.get_by_role('switch',name='Sound',exact=True).count()==0;assert sound.get_by_role('heading',name='Your radio',exact=True).count()==0;assert 'Use the arrows to tune' not in sound.inner_text();assert sound.get_by_role('switch',name='Vinyl crackle',exact=False).count()==0
 page.get_by_role('tab',name='Settings',exact=True).click();assert page.get_by_role('switch',name='Sound',exact=True).count()==1
 crackle=page.get_by_role('switch',name='Vinyl crackle',exact=False);before_crackle=crackle.get_attribute('aria-checked');crackle.click();assert crackle.get_attribute('aria-checked')!=before_crackle;assert page.evaluate('__lr.meta.crackle')==(before_crackle!='true');crackle.click();assert crackle.get_attribute('aria-checked')==before_crackle
 picker=page.get_by_role('combobox',name='Daypart',exact=True);assert picker.evaluate('e=>getComputedStyle(e).borderRadius')=='14px';assert picker.evaluate('e=>getComputedStyle(e).appearance')=='base-select';picker.select_option('evening');assert page.evaluate('__lr.meta.phase')=='evening'
 # Opened picker itself, not only its closed field, uses the theme.
 picker.click();page.wait_for_function('document.querySelector("select[aria-label=Daypart]").matches(":open")');assert picker.evaluate('e=>getComputedStyle(e,"::picker(select)").borderRadius')=='16px';page.screenshot(path='/tmp/cozy-dropdown-day.png');page.keyboard.press('Escape');assert page.locator('#sheet').evaluate('e=>e.classList.contains("open")')
 page.keyboard.press('Escape');music=page.locator('#bMusic');before=page.evaluate('__lr.meta.music');music.click();assert page.evaluate('__lr.meta.music')!=before;music.click();assert page.evaluate('__lr.meta.music')==before
 def hold_mouse():
  box=music.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(650);page.mouse.up()
 hold_mouse();assert page.get_by_role('tab',name='Sound',exact=True).get_attribute('aria-selected')=='true';assert page.evaluate('__lr.meta.music')==before;assert page.get_by_role('tab',name='Sound',exact=True).evaluate('e=>e===document.activeElement');page.keyboard.press('Escape')
 # Touch-context-menu activation also opens Sound without toggling playback.
 music.dispatch_event('pointerdown',{'pointerId':19,'pointerType':'touch','button':0,'clientX':30,'clientY':30});music.dispatch_event('contextmenu',{});music.dispatch_event('pointerup',{'pointerId':19});assert page.locator('#menu-sound').is_visible();assert page.evaluate('__lr.meta.music')==before;page.keyboard.press('Escape')
 music.dispatch_event('pointerdown',{'pointerId':20,'pointerType':'touch','button':0,'clientX':30,'clientY':30});music.dispatch_event('pointercancel',{'pointerId':20});page.wait_for_timeout(650);assert not page.locator('#sheet').evaluate('e=>e.classList.contains("open")')
 music.focus();page.keyboard.press('Space');assert page.evaluate('__lr.meta.music')!=before;music.click();assert page.evaluate('__lr.meta.music')==before
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.todayUI.refresh()}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':1000});hold_mouse();assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/radio-clean-{phase}-{width}.png');page.get_by_role('tab',name='Settings',exact=True).click();picker=page.get_by_role('combobox',name='Daypart',exact=True);picker.click();page.screenshot(path=f'/tmp/cozy-dropdown-{phase}-{width}.png');page.keyboard.press('Escape');page.keyboard.press('Escape')
 assert not errors,errors;browser.close()
server.shutdown()
print('PASS: no chosen badge or radio intro/Sound toggle; Sound remains in Settings; long-press/touch/cancel and normal tap/keyboard; themed native dropdown fields and opened pickers; responsive day/night')
