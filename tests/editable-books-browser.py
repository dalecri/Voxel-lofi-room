"""Build www first. Books sit on surfaces and save directly edited pages per placed book."""
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
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI');page.evaluate('__lr.renderLoop.stop()')
 page.evaluate('''()=>{const r=__lr.room;r.items=[];const table=r.add({t:'desk',x:2,z:2,c:0,r:0});window.bookIds=[r.add({t:'editablebook',p:table.id,lx:0,lz:0,c:0,r:0}).id,r.add({t:'editablebook',p:table.id,lx:1,lz:0,c:1,r:0}).id];__lr.changed();__lr.interact(bookIds[0]);}''')
 page.get_by_label('Book title',exact=True).fill('PRIVATE_BOOK_TITLE');page.get_by_label('Left page',exact=True).fill('PRIVATE_LEFT <script>literal text</script>');page.get_by_label('Right page',exact=True).fill('PRIVATE_RIGHT')
 page.get_by_role('button',name='Add book pages',exact=True).click();page.get_by_label('Left page',exact=True).fill('PRIVATE_THIRD');assert page.locator('.book-page-number').all_text_contents()==['3','4']
 page.get_by_role('button',name='Previous book pages',exact=True).click();assert page.get_by_label('Left page',exact=True).input_value().startswith('PRIVATE_LEFT')
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');assert page.locator('.book-paper').count()==2;page.screenshot(path=f'/tmp/writing-book-{phase}-{width}.png')
 page.keyboard.press('Escape');page.evaluate('__lr.interact(bookIds[1])');assert page.get_by_label('Left page',exact=True).input_value()==''
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI');page.evaluate('__lr.renderLoop.stop();__lr.interact(__lr.room.items.find(i=>i.t==="editablebook").id)');assert page.get_by_label('Book title',exact=True).input_value()=='PRIVATE_BOOK_TITLE';assert page.get_by_label('Right page',exact=True).input_value()=='PRIVATE_RIGHT'
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'editablebook' in raw;assert 'PRIVATE_' not in raw;assert not errors,errors
 print('PASS writing books: surface placement/tap, direct edits, extra pages/navigation, independent books, reload, private content, phone/desktop themes')
 browser.close()
server.shutdown()
