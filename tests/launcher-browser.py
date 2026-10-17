"""npm run build && python3 tests/launcher-browser.py. Direct tools without furniture and shared app directory."""
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
 context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script("localStorage.setItem('lr.intro','true')")
 calls=[]
 def route(r):
  if r.request.url.startswith('http://127.0.0.1:'):r.continue_()
  elif r.request.url=='https://www.cbc.ca/webfeed/rss/rss-topstories':calls.append(r.request.url);r.fulfill(content_type='application/rss+xml',headers={'access-control-allow-origin':'*'},body='<rss><channel><item><title>Fixture headline</title><link>https://www.cbc.ca/news/test</link></item></channel></rss>')
  else:raise AssertionError(r.request.url)
 context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');page.set_default_timeout(10000)
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.meta.visitors=false;a.meta.realtime=false;a.meta.dreamy=false;a.setMode('explore',true);a.changed();window.opened=[];window.open=(...args)=>opened.push(args);}''')
 view=page.locator('#homeView');body=page.locator('#sheetBody')
 def launch(id):page.click('#bHome');view.locator('[data-app="'+id+'"]').click();assert not page.evaluate('__lr.home.active')
 launch('typewriter');page.locator('#letterBody').fill('PRIVATE_HOME_TOOL_LETTER');page.click('#letterClose')
 expected={'mailbox':'Letters to future you','groceries':'On the fridge','ideas':'The idea jar','tea':'Tea','savings':'A little savings jar','sketch':'A little sketchbook','french':'A little French','whiteboard':'A little whiteboard','focus':'A little time to focus','wardrobe':'A little wardrobe','tst':'TwoStoryTails'}
 for id,title in expected.items():
  launch(id);assert title in body.inner_text(),(id,body.inner_text())
  if id=='ideas':
   body.get_by_role('button',name='Drop in an idea',exact=True).click();body.get_by_role('textbox',name='A little idea').fill('PRIVATE_HOME_TOOL_IDEA');body.get_by_role('button',name='Drop in jar',exact=True).click()
  if id=='whiteboard':body.get_by_role('textbox',name='Whiteboard text').fill('PRIVATE_HOME_TOOL_BOARD')
  page.keyboard.press('Escape');assert not page.locator('#sheet').evaluate("e=>e.classList.contains('open')")
 launch('focus');assert page.evaluate('__lr.rituals.focus(__lr.meta.current,"control-center-focus").active');page.click('#focusSnuff');assert not page.evaluate('__lr.rituals.focus(__lr.meta.current,"control-center-focus").active')
 for id,tab in [('letters','Letters'),('scenes','Scenes'),('photos','Photos')]:
  launch(id);assert page.get_by_role('tab',selected=True).inner_text()==tab;page.keyboard.press('Escape')
 for id,tab in [('sound','Sound')]:
  launch(id);assert page.get_by_role('tab',selected=True).inner_text()==tab;page.keyboard.press('Escape')
 page.click('#bHome');assert view.locator('[data-app=rooms],[data-app=journal],[data-app=settings]').count()==0;view.get_by_role('button',name='Settings',exact=True).click();assert page.get_by_role('tab',selected=True).inner_text()=='Settings';page.keyboard.press('Escape')
 launch('newspaper');page.wait_for_function("document.querySelector('#sheetBody').textContent.includes('Fixture headline')");page.keyboard.press('Escape');assert len(calls)==1
 page.click('#bHome');view.get_by_role('searchbox',name='Find a tool or app').fill('voxel');assert view.locator('[data-app]').count()==1;view.locator('[data-app]').click();assert page.evaluate('opened.at(-1)')==['https://heycristobal.com/voxel-worlds/','_blank','noopener,noreferrer']
 page.click('#bHome');view.get_by_role('button',name='＋ Add your own',exact=True).click();body.get_by_role('textbox',name='Name',exact=True).fill('PRIVATE_HOME_LINK');body.get_by_role('textbox',name='URL',exact=True).fill('https://example.com/owner');body.get_by_role('button',name='Add destination',exact=True).click();page.keyboard.press('Escape')
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');page.evaluate('''() => {window.opened=[];window.open=(...a)=>opened.push(a);}''');page.click('#bHome');view.get_by_role('searchbox',name='Find a tool or app').fill('PRIVATE_HOME_LINK');view.locator('[data-app]').click();assert page.evaluate('opened.at(-1)[0]')=='https://example.com/owner'
 page.evaluate('__lr.dashboard.launcher()');assert body.get_by_role('button',name='Typewriter',exact=True).count()==1;assert body.get_by_role('button',name='PRIVATE_HOME_LINK',exact=True).count()==1;body.get_by_role('button',name='Typewriter',exact=True).click();assert page.locator('#letterBody').inner_text()=='PRIVATE_HOME_TOOL_LETTER';page.click('#letterClose')
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',code);assert 'PRIVATE_HOME' not in json.dumps(decoded)
 page.click('#bHome');view.locator('[data-app="whiteboard"]').click();assert body.get_by_role('textbox',name='Whiteboard text').input_value()=='PRIVATE_HOME_TOOL_BOARD';page.keyboard.press('Escape')
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':844});page.click('#bHome');view.locator('.home-apps').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/home-apps-{width}.png');page.keyboard.press('Escape')
 assert not errors,errors
 print('PASS: real tools without furniture, shared Home/phone directory, private custom links and tool data across reload, external popup-safe links, existing files/notifications, responsive widths and Escape',flush=True)
 browser.close()
server.shutdown()
