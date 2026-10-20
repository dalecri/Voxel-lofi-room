"""Build www first. Compact date controls retain native values, validation and keyboard access."""
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
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({phase:'day',realtime:false,visitors:false,calmPerformance:true}));")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI');page.evaluate('__lr.renderLoop.stop()');page.evaluate('__lr.roomToolsUI.open("mailbox")')
 def check(name,value):
  control=page.get_by_label(name,exact=True);control.fill(value)
  assert control.input_value()==value
  wrapper=page.locator('.compact-date').filter(has=control);assert '2027' in wrapper.locator('time').inner_text()
  for phase in ['day','night']:
   page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
   for width in [320,390,1280]:
    page.set_viewport_size({'width':width,'height':844});box=control.bounding_box();assert box['width']==44 and box['height']==44,box
    assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
    page.screenshot(path=f'/tmp/compact-date-{name.replace(" ","-")}-{phase}-{width}.png')
  control.evaluate("e=>{window.pickerOpened=0;e.showPicker=()=>window.pickerOpened=(window.pickerOpened||0)+1;e.addEventListener('click',event=>event.preventDefault())}")
  control.click();assert page.evaluate('window.pickerOpened')==1
  control.focus();page.keyboard.press('Space');assert page.evaluate('window.pickerOpened')==2
  assert control.evaluate('e=>e.required')
 check('Deliver on','2027-06-12')
 due=page.get_by_label('Deliver on',exact=True);due.fill('2020-01-01');assert not due.evaluate('e=>e.checkValidity()');due.fill('2027-06-12')
 page.get_by_role('button',name='Save draft',exact=True).click();page.evaluate('__lr.roomToolsUI.open("mailbox")');assert page.get_by_label('Deliver on',exact=True).input_value()=='2027-06-12'
 page.evaluate('__lr.calendar.openDay("2027-06-12")');check('Date','2027-06-13')
 page.get_by_label('Title',exact=True).fill('PRIVATE_DATE_EVENT');page.get_by_role('button',name='Add event',exact=True).click();assert page.locator('.calendar-event b').inner_text()=='PRIVATE_DATE_EVENT'
 assert page.evaluate('__lr.calendarModel.events().find(e=>e.title==="PRIVATE_DATE_EVENT").date')=='2027-06-13';assert not errors,errors
 print('PASS compact mail/calendar dates: 44px icon, readable selection, click/keyboard picker, native validation, draft and event persistence, themes/widths')
 browser.close()
server.shutdown()
