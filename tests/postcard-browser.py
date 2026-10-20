"""npm run build && python3 tests/postcard-browser.py — local pixel stationery and future delivery."""
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
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script('''const RealDate=Date;window.__clock=new RealDate('2026-10-18T14:00:00').getTime();window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[window.__clock]))}static now(){return window.__clock}};localStorage.setItem('lr.intro','true');''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 context.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.letters');page.evaluate('__lr.renderLoop.stop()')
 def no_overflow():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();page.evaluate('__lr.letters.open()')
 card=page.locator('#lettersView .pixel-postcard');assert card.count()==1;assert page.locator('.postcard-picture').count()==0;assert card.locator('.postcard-stamp').get_attribute('aria-label')=='Tulips pixel illustration'
 page.locator('#letterBody').fill('Here is a tiny pixel letter, tucked inside its own little world.');page.get_by_label('Subject',exact=True).fill('Thinking of you today')
 page.locator('.letter-details summary').click();card.get_by_role('button',name='Cat picture',exact=True).click();assert card.get_by_role('button',name='Cat picture',exact=True).get_attribute('aria-pressed')=='true';page.locator('#letterSave').click();assert page.evaluate('__lr.letters.model.get().cardIcon')=='cat'
 page.reload(wait_until='networkidle');ready();page.evaluate('__lr.letters.open()');assert card.locator('.postcard-stamp').get_attribute('aria-label')=='Cat pixel illustration'
 # Sending the regular letter retains formatting and permits choosing a different future-card picture.
 page.locator('#letterSend').click();future=page.locator('#sheet .pixel-postcard');assert future.locator('.postcard-stamp').get_attribute('aria-label')=='Cat pixel illustration';assert page.locator('textarea.mailwin-body').evaluate('e=>e.readOnly')
 future.get_by_role('button',name='Moon picture',exact=True).click();page.get_by_label('Deliver on',exact=True).fill('2026-10-20');page.get_by_role('button',name='Save draft',exact=True).click();assert page.evaluate('__lr.roomTools.mailDraft.cardIcon')=='moon'
 page.keyboard.press('Escape');page.evaluate("__lr.roomToolsUI.open('mailbox')");assert future.locator('.postcard-stamp').get_attribute('aria-label')=='Moon pixel illustration'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});no_overflow();future.scroll_into_view_if_needed();assert future.locator('.postcard-picker button').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().width>=44 && e.getBoundingClientRect().height>=44)');future.screenshot(path=f'/tmp/pixel-postcard-compose-{phase}-{width}.png')
 page.set_viewport_size({'width':390,'height':844});page.get_by_role('button',name='Send',exact=True).click();assert page.evaluate('__lr.roomTools.state.mail[0].cardIcon')=='moon';assert page.get_by_role('button',name='Read letter',exact=True).count()==0
 page.keyboard.press('Escape');page.evaluate("window.__clock=new Date('2026-10-20T14:00:00').getTime();__lr.roomToolsUI.open('mailbox')");page.get_by_role('button',name='Read letter',exact=True).click();read=page.locator('.postcard-read');assert read.locator('.postcard-stamp').get_attribute('aria-label')=='Moon pixel illustration';assert 'tiny pixel letter' in read.locator('.roomtool-letter').inner_text();assert read.locator('.postcard-picker').count()==0
 assert read.locator('.postcard-readhead').evaluate('e=>getComputedStyle(e).display==="block"');read.screenshot(path='/tmp/pixel-postcard-delivered-390.png');no_overflow();assert page.evaluate('__lr.letters.model.get().cardIcon')=='cat'
 # A normal future-card draft also restores a newly chosen icon; old letters default gracefully.
 page.get_by_role('button',name='Back to mailbox',exact=True).click();page.get_by_label('Message',exact=True).fill('A small note for later');page.get_by_role('button',name='Tea picture',exact=True).click();page.get_by_role('button',name='Save draft',exact=True).click();page.reload(wait_until='networkidle');ready();page.evaluate("__lr.roomToolsUI.open('mailbox')");assert page.get_by_role('button',name='Tea picture',exact=True).get_attribute('aria-pressed')=='true';assert page.get_by_label('Message',exact=True).input_value()=='A small note for later'
 page.keyboard.press('Escape');page.evaluate('__lr.letters.open()');page.locator('#letterScroll').evaluate('e=>e.scrollTop=0');page.screenshot(path='/tmp/pixel-postcard-typewriter-390.png');assert not errors,errors
 print('PASS pixel postcards: regular/future pictures, draft/reload/sealed arrival, independent icons, accessible 44px picker, mobile/desktop/day/night, no console errors',flush=True)
 browser.close()
server.shutdown()
