"""Build www first. Private widget order, accessible editing, real mouse/touch drag and live content."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':1000},has_touch=True,reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.widgetFixture){localStorage.widgetFixture='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({phase:'day',realtime:false,visitors:false,mischief:false,calmPerformance:true}));}''')
 context.add_init_script("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>window.copied=t}})")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[{'id':'widget-test','desc':'A synthetic caption idea','status':'idea','selectedTones':['Relatable'],'captions':['A synthetic caption'],'created':'2026-10-20T12:00:00Z'}]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def ready():page.wait_for_function('!!window.__lr?.todayUI');page.evaluate('__lr.renderLoop.stop()')
 def open_today():page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()
 def order():return page.locator('.today-widget-stack > section').evaluate_all('es=>es.map(e=>e.dataset.widget)')
 def stored():return page.evaluate('JSON.parse(localStorage.getItem("lr.meta")).dashboardWidgetOrder')
 def edit():
  widget=page.locator('.today-widget-stack > section').first;widget.focus();widget.press('Space')
 def done():page.get_by_role('button',name='Done',exact=True).click()
 def up(name):page.get_by_role('button',name='Move '+name+' widget up',exact=True).click()
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();open_today()
 default=['week','feature','tools','weather'];assert order()==default;assert page.locator('.space-today .today-tasks,.space-today .today-google-focus,[data-widget="tasks"]').count()==0
 assert page.locator('.today-welcome').evaluate('e=>!e.closest(".today-widget-stack") && !e.closest("[data-widget]")')
 assert page.locator('.today-welcome .today-condition').count()==1
 assert page.locator('.today-widget-controls:visible').count()==0;assert page.get_by_role('button',name='Arrange widgets',exact=True).count()==0
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':1000});page.locator('#sheetBody').evaluate('e=>e.scrollTop=0')
   assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
   assert page.locator('.today-widget').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().width<=e.parentElement.clientWidth+1)')
   page.screenshot(path=f'/tmp/today-widgets-{phase}-{width}.png')
 page.set_viewport_size({'width':390,'height':1000});page.evaluate('__lr.setPhase("day",true)')
 # Mouse hold starts editing and a lifted preview; releasing never opens the held calendar day.
 day=page.locator('.today-week-day').first;day.scroll_into_view_if_needed();a=day.bounding_box();page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down();page.wait_for_timeout(650)
 assert page.locator('.today-widget-stack').evaluate('e=>e.classList.contains("is-arranging")');assert page.locator('.today-widget-drag-preview').count()==1
 page.emulate_media(reduced_motion='no-preference');page.wait_for_function('getComputedStyle(document.querySelector("[data-widget=feature]")).animationName==="today-widget-wiggle"')
 page.emulate_media(reduced_motion='reduce');page.wait_for_function('getComputedStyle(document.querySelector("[data-widget=feature]")).animationName==="none"')
 page.mouse.up();assert page.locator('.calendar-detail').count()==0;assert page.locator('.today-widget-drag-preview').count()==0;done()
 # Content continuity: the French word card's text survives being moved around.
 card=page.locator('.today-feature .french-today-card');card.wait_for();word=card.inner_text()
 edit();assert page.locator('.today-widget-body').evaluate_all('es=>es.every(e=>e.inert)');assert page.locator('.today-widget-controls:visible').count()==4
 assert page.get_by_role('button',name='Move This week widget up',exact=True).is_disabled()
 for _ in range(3):up('Weather')
 assert order()[0]=='weather';assert stored()==order()
 handle=page.get_by_role('button',name='Drag Weather widget',exact=True);handle.focus();handle.press('ArrowDown');assert order()[1]=='weather' and stored()==order();handle.press('ArrowUp')
 # Mouse drag moves the first widget below the second, without rebuilding either.
 page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');handle.scroll_into_view_if_needed();a=handle.bounding_box();target=page.locator('[data-widget=week]').bounding_box();end_y=target['y']+target['height']-12
 assert end_y<1000
 page.mouse.move(a['x']+22,a['y']+22);page.mouse.down();page.mouse.move(a['x']+22,end_y,steps=12);page.wait_for_timeout(100);page.mouse.up();assert order()[:2]==['week','weather'],(order(),page.locator('.today-widget-status').inner_text());assert stored()==order()
 up('Weather');before=order();done()
 # Chromium touch input drives the actual pointer-capture path, including cancellation.
 cdp=context.new_cdp_session(page)
 def touch_drag(cancel=False):
  page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');source=page.locator('[data-widget=weather]');source.scroll_into_view_if_needed();a=source.bounding_box();x=a['x']+20;start=a['y']+5
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':start}]});page.wait_for_timeout(650)
  assert page.locator('.today-widget-drag-preview').count()==1
  target=page.locator('[data-widget=week]').bounding_box();end=min(960,target['y']+target['height']-12)
  for i in range(1,13):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':start+(end-start)*i/12}]})
  page.wait_for_timeout(100);cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel' if cancel else 'touchEnd','touchPoints':[]})
 touch_drag(True);assert order()==before and stored()==before;done()
 touch_drag();assert order()[:2]==['week','weather'] and stored()==order()
 done();assert page.locator('.today-widget-body').evaluate_all('es=>es.every(e=>!e.inert)');assert card.inner_text()==word
 saved=order();page.keyboard.press('Escape');open_today();assert order()==saved
 page.reload(wait_until='networkidle');ready();open_today();assert order()==saved;assert not page.locator('.today-widget-stack').evaluate('e=>e.classList.contains("is-arranging")')
 # A quick touch swipe keeps normal scrolling and never enters jiggle mode.
 page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');a=page.locator('[data-widget=week]').bounding_box();x=a['x']+a['width']/2;y=a['y']+a['height']/2
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-i*20}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(600)
 assert not page.locator('.today-widget-stack').evaluate('e=>e.classList.contains("is-arranging")');assert page.locator('#sheetBody').evaluate('e=>e.scrollTop')>30
 # Failed writes restore the previous layout and leave the actual preference intact.
 edit();before=order();page.evaluate('()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="lr.meta")throw Error("fixture quota");return originalSet.call(this,k,v)}}')
 up('Weather');assert order()==before and stored()==before;assert 'previous order is restored' in page.locator('.today-widget-status').inner_text();page.evaluate('()=>{Storage.prototype.setItem=originalSet}')
 page.get_by_role('button',name='Reset order',exact=True).click();assert order()==default and stored()==default;done()
 assert page.evaluate('localStorage.getItem("lr.dashboardWidgetOrder")') is None
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'dashboardWidgetOrder' not in raw
 # The grouped shortcuts and calendar still route to their existing tools.
 page.locator('[data-ritual=tea]').click();page.locator('.tea-dial').wait_for();page.keyboard.press('Escape');open_today();page.locator('.today-week-day').last.click();page.locator('.calendar-detail').wait_for()
 assert not errors,errors;print('PASS widget frames/themes/widths, fixed welcome, mouse/touch hold, wiggle/reduced motion, swipe scrolling, arrow/keyboard/mouse/touch/cancel ordering, reload/reopen persistence, quota rollback, reset, caption continuity/copy, navigation and private share boundary')
 browser.close()
server.shutdown()
