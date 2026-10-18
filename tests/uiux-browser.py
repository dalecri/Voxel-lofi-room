"""npm run build && python3 tests/uiux-browser.py. Live-review regressions at 390px and desktop."""
import functools,re
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
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script('''if(!sessionStorage.reviewFixture){sessionStorage.reviewFixture='true';const r={v:1,name:'Review room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'edit','lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.tipEdit':true,'lr.tipKeys':false,'lr.meta':{current:101,phase:'night',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];dialogs=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('dialog',lambda d:(dialogs.append(d.message),d.dismiss()));page.set_default_timeout(20000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 def open_menu(tab='Today'):
  page.click('#bMenu');page.wait_for_function('document.querySelector("#sheet").classList.contains("open")');page.get_by_role('tab',name=tab,exact=True).click();assert page.locator('#sheet').get_attribute('aria-hidden')=='false';assert not page.locator('#sheet').evaluate('e=>e.inert');assert page.locator('#bMenu').get_attribute('aria-expanded')=='true'
 def closed():
  page.wait_for_function('!document.querySelector("#sheet").classList.contains("open") && document.querySelector("#sheet").inert');page.locator('#sheet').wait_for(state='hidden');assert page.locator('#sheet').get_attribute('aria-hidden')=='true';assert page.locator('#bMenu').get_attribute('aria-expanded')=='false'
 def affordance(editing):
  assert page.evaluate('__lr.state.mode')==('edit' if editing else 'explore')
  assert page.get_by_role('button',name='Done decorating',exact=True).count()==int(editing)
  assert page.get_by_role('button',name='Decorate this room',exact=True).count()==int(not editing)
  assert page.locator('.tools').evaluate('e=>e.inert')== (not editing)
  assert page.locator('.explorebar').evaluate('e=>e.inert')==editing
 affordance(False);assert page.evaluate('localStorage.getItem("lr.mode")') is None
 for width in [390,1280]:
  page.set_viewport_size({'width':width,'height':844})
  assert page.locator('#disc').evaluate('e=>!e.closest("button") && e.parentElement===document.querySelector("#brand").parentElement')
  before=len(dialogs);page.click('#disc');assert len(dialogs)==before;page.click('#brand');assert dialogs[-1]=='Name this room'
  for action in ['h','Escape','Close','Menu keyboard','Menu tap']:
   open_menu()
   if action=='h':page.keyboard.press('h')
   elif action=='Escape':page.get_by_role('textbox',name='A little task',exact=True).focus();page.keyboard.press('Escape')
   elif action=='Close':page.locator('#sheetBody .menu-nav .menu-actions > .sheet-close').click()
   elif action=='Menu keyboard':page.locator('#bMenu').focus();page.keyboard.press('Enter')
   else:
    box=page.locator('#bMenu').bounding_box();page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
   closed()
  # H must remain usable as a letter while editing a task; Escape still dismisses.
  open_menu();task=page.get_by_role('textbox',name='A little task',exact=True);task.focus();page.keyboard.type('hello');assert task.input_value()=='hello';assert page.locator('#sheet').get_attribute('aria-hidden')=='false';page.keyboard.press('Escape');closed()
  page.click('#bEdit');affordance(True)
  if width==390:
   page.wait_for_function('[...document.querySelectorAll("#toasts .toast")].some(e=>e.textContent.includes("Mouse & keys"))')
   help=page.locator('#toasts .toast').filter(has_text='Mouse & keys').inner_text().replace('\xa0',' ')
   assert '· ←→ pick · ↑↓ tabs · R turn · Del remove' in re.sub(r'\s+',' ',help),help
  page.get_by_role('button',name='Done decorating',exact=True).click();affordance(False)
  page.keyboard.press('x');affordance(True);page.keyboard.press('x');affordance(False)
  page.click('#bEdit');affordance(True);page.evaluate('localStorage.setItem("lr.mode",JSON.stringify("edit"))');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');affordance(False);assert page.evaluate('localStorage.getItem("lr.mode")') is None
  open_menu('Rooms');assert re.sub(r'\s+',' ',page.locator('#menu-rooms h2').first.text_content())=='Your home · 1 room';page.keyboard.press('Escape');closed()
  open_menu('Today');heads=page.locator('#menu-today h2,#menu-today h3').all_text_contents();assert heads[0].startswith('Good ');assert heads[1:]==['Google Tasks',"Today's moment"],heads
  assert page.locator('#menu-today .daily-notice').count()==0;assert page.locator('#menu-today .today-sky').evaluate('e=>e.nextElementSibling.classList.contains("today-duo")');page.screenshot(path=f'/tmp/uiux-today-{width}.png');page.get_by_role('tab',name='Settings',exact=True).click()
  switches=page.locator('#menu-settings .toggle');assert switches.count()==13
  assert switches.evaluate_all('es=>es.every(e=>e.getAttribute("role")==="switch" && e.getAttribute("aria-pressed")===String(e.classList.contains("on")) && e.getAttribute("aria-checked")===e.getAttribute("aria-pressed"))')
  mischief=page.get_by_role('switch',name=re.compile('^Cat mischief'));before=mischief.get_attribute('aria-checked');mischief.click();assert mischief.get_attribute('aria-checked')!=before;assert mischief.get_attribute('aria-pressed')==mischief.get_attribute('aria-checked');assert mischief.evaluate('e=>document.activeElement===e');page.screenshot(path=f'/tmp/uiux-settings-{width}.png')
  # Close still works when the optional interface sound device fails.
  page.evaluate('window.slideBefore=__lr.Sound.slide;__lr.Sound.slide=()=>{throw Error("unavailable audio")};void 0;');page.locator('#sheetBody .menu-nav .menu-actions > .sheet-close').click();closed();page.evaluate('__lr.Sound.slide=slideBefore;void 0');assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 print('PASS: sibling progress never renames; H/Escape/Close/Menu keyboard and real tap dismiss; task typing stays intact; transient decorate mode and one accessible affordance; spaced headings/help; switch states/focus; mobile/desktop without console errors',flush=True)
 browser.close()
server.shutdown()
