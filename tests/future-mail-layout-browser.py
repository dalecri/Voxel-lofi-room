"""Build www first. Future-letter composer fits without sheet scrolling; history stays separate."""
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
 context.add_init_script('''if(!localStorage.mailFixture){localStorage.mailFixture='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({phase:'day',realtime:false,visitors:false,calmPerformance:true}));}const RealDate=Date;window.__clock=new RealDate('2026-10-18T14:00:00').getTime();window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[window.__clock]))}static now(){return window.__clock}};''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def ready():page.wait_for_function('!!window.__lr?.roomToolsUI');page.evaluate('__lr.renderLoop.stop()')
 def open_mail():page.click('#bHome');page.locator('[data-app=mailbox]').click();page.get_by_role('textbox',name='Message',exact=True).wait_for()
 def fit():
  assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth && e.scrollHeight<=e.clientHeight+1')
  for name in ['Subject','Message','Deliver on']:
   assert page.get_by_label(name,exact=True).evaluate('e=>{const r=e.getBoundingClientRect(),s=e.closest("#sheetBody").getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom+1}')
  for name in ['Save draft','Send','Your envelopes']:
   assert page.get_by_role('button',name=name,exact=True).evaluate('e=>{const r=e.getBoundingClientRect(),s=e.closest("#sheetBody").getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom+1}')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();open_mail()
 page.get_by_label('Subject',exact=True).fill('PRIVATE_FUTURE_TITLE');page.get_by_label('Message',exact=True).fill('PRIVATE_FUTURE_MESSAGE\nA little hope for tomorrow.');page.get_by_label('Deliver on',exact=True).fill('2026-10-20')
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width,height in [(320,844),(390,844),(1280,844),(390,500),(390,400),(320,400)]:
   page.set_viewport_size({'width':width,'height':height});fit()
   page.locator('.future-mail-details summary').click()
   assert page.locator('.future-mail-options').evaluate('e=>{const r=e.getBoundingClientRect(),s=e.closest("#sheetBody").getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom+1&&e.scrollHeight<=e.clientHeight+1}')
   page.get_by_role('button',name='Done',exact=True).click();page.screenshot(path=f'/tmp/future-mail-fit-{phase}-{width}-{height}.png')
   page.get_by_label('Message',exact=True).fill('PRIVATE_FUTURE_MESSAGE\n'+'A long thought.\n'*100);fit()
   assert page.get_by_label('Message',exact=True).evaluate('e=>e.scrollHeight>e.clientHeight')
 page.set_viewport_size({'width':390,'height':844});page.get_by_label('Message',exact=True).fill('PRIVATE_FUTURE_MESSAGE\nA little hope for tomorrow.')
 page.locator('.future-mail-details summary').click();page.get_by_label('From',exact=True).fill('A friend');page.get_by_label('To',exact=True).fill('Future me');page.get_by_role('button',name='Star picture',exact=True).click();page.keyboard.press('Escape');assert page.locator('.future-mail').is_visible();fit()
 page.get_by_role('button',name='Save draft',exact=True).click();assert page.evaluate('__lr.roomTools.mailDraft.cardIcon')=='star'
 # Opening envelopes saves the current draft, and returning restores it.
 page.get_by_role('button',name='Your envelopes',exact=True).click();page.get_by_role('button',name='Write a letter',exact=True).click();assert page.get_by_label('Message',exact=True).input_value().startswith('PRIVATE_FUTURE_MESSAGE');fit()
 page.get_by_role('button',name='Send',exact=True).click();assert page.locator('.mailwin-letter').count()==1;assert 'PRIVATE_FUTURE_MESSAGE' not in page.locator('#sheetBody').inner_text();assert page.get_by_role('button',name='Read letter',exact=True).count()==0
 page.get_by_role('button',name='Write a letter',exact=True).click();fit();assert page.get_by_label('Message',exact=True).input_value()==''
 page.get_by_role('button',name='Back to Control Centre',exact=True).click();page.locator('#homeView').wait_for();page.keyboard.press('Escape');page.reload(wait_until='networkidle');ready();open_mail();fit();page.get_by_role('button',name='Your envelopes',exact=True).click();assert 'Sealed until 2026-10-20' in page.locator('#sheetBody').inner_text()
 page.keyboard.press('Escape');page.evaluate('window.__clock=new Date("2026-10-20T14:00:00").getTime()');page.evaluate('__lr.roomToolsUI.open("mailbox")');page.get_by_role('button',name='Your envelopes',exact=True).click();page.get_by_role('button',name='Read letter',exact=True).click();assert 'PRIVATE_FUTURE_MESSAGE' in page.locator('.roomtool-letter').inner_text();assert page.locator('.postcard-stamp').get_attribute('aria-label')=='Star pixel illustration'
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'PRIVATE_FUTURE' not in raw;assert not errors,errors
 print('PASS future mail fits day/night phone/desktop/short screens, internal long-message scrolling, picture/details, draft/history, sealed delivery, Back and privacy')
 browser.close()
server.shutdown()
