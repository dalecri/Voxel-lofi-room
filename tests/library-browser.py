"""npm run build && python3 tests/pixel-maker-browser.py. Private lectern cover, reader, notes, bookmarks, and responsive layout."""
import functools,json,base64
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
 context=browser.new_context(timezone_id='America/Toronto',reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script('''if(!sessionStorage.houseFixture){sessionStorage.houseFixture='true';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.draft':{id:102,base:'',data:{...b,name:'Living draft restored'}},'lr.mainBedroom':101,'lr.meta':{current:102,visitors:false,realtime:false,dreamy:false,phase:'day',stations:[{name:'Old station',url:'https://example.com/old.mp3'}]}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 context.add_init_script('if(!sessionStorage.libraryFixture){sessionStorage.libraryFixture=\'true\';localStorage.setItem(\'lr.library\',JSON.stringify({title:\'My Library\',next:2,notes:[{id:\'past\',text:\'PRIVATE_LAST_AUTUMN\',createdAt:+new Date(2025,9,16,12)}]}));localStorage.setItem(\'lr.letters\',JSON.stringify({next:2,current:\'fixture\',letters:[{id:\'fixture\',title:\'PRIVATE_LETTER\',letterhead:\'A little room\',body:\'<b>Hello from a letter</b><img src="https://example.com/leak" onerror="window.libraryUnsafe=true">\'+\'A long thought. \'.repeat(1000),createdAt:+new Date(2026,9,15,14)}]}));localStorage.setItem(\'lr.tools\',JSON.stringify({ideas:[{id:\'fixture\',text:\'PRIVATE_SPARK\',createdAt:+new Date(2026,9,14,14)}]}));}const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[new OriginalDate(2026,9,16,14).getTime()]))}static now(){return new OriginalDate(2026,9,16,14).getTime()}}')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 page.evaluate("const a=__lr;a.room.items=[];window.lectern=a.room.add(a.room.make('lectern',{x:2,z:2}));a.changed();a.interact(lectern.id)")
 for c in range(3):
  data=page.evaluate('c=>__lr.view.thumb({t:"lectern",c,on:true})',c);Path(f'/tmp/library-lectern-{c}.png').write_bytes(base64.b64decode(data.split(',')[1]))
 view=page.locator('#libraryView');assert view.is_visible();assert view.get_attribute('data-page')=='cover';assert view.get_by_role('button',name='Rename library',exact=True).inner_text()=='My Library'
 assert page.evaluate('__lr.library.model.pages()[0].id')=='compose';assert page.evaluate('__lr.library.model.pages()[1].memory')
 view.get_by_role('button',name='Rename library',exact=True).click();view.get_by_role('textbox',name='Library title',exact=True).fill('PRIVATE_QUIET_LIBRARY');view.get_by_role('button',name='Save title',exact=True).click()
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.library")).title')=='PRIVATE_QUIET_LIBRARY'
 view.get_by_role('button',name='Open library book',exact=True).click();assert view.get_attribute('data-page')=='compose'
 view.get_by_role('textbox',name='Quick note',exact=True).fill('PRIVATE_NEW_NOTE');view.get_by_role('button',name='Keep this note',exact=True).click();assert view.locator('.library-entry').inner_text()=='PRIVATE_NEW_NOTE'
 note_page=view.get_attribute('data-page');assert page.evaluate('__lr.library.model.entries()[0].kind')=='NOTE'
 view.get_by_role('button',name='Next page',exact=True).click();assert view.locator('.library-smallcaps').last.inner_text().startswith('LETTER');assert view.locator('.library-entry b').inner_text()=='Hello from a letter';assert view.locator('.library-entry img').count()==0;assert page.evaluate('!window.libraryUnsafe')
 assert view.locator('.library-page-content').evaluate('e=>e.scrollHeight>e.clientHeight');view.locator('.library-page-content').evaluate('e=>e.scrollTop=150');assert view.locator('.library-page-content').evaluate('e=>e.scrollTop')==150
 view.get_by_role('button',name='Next page',exact=True).click();assert view.locator('.library-entry').inner_text()=='PRIVATE_SPARK';bookmark=view.get_attribute('data-page')
 page.keyboard.press('Escape');assert not view.is_visible();page.evaluate('__lr.interact(lectern.id)');assert view.get_attribute('data-page')=='cover'
 view.get_by_role('button',name='Open library book',exact=True).click();assert view.get_attribute('data-page')==bookmark;assert view.locator('.library-ribbon').is_visible()
 # A horizontal swipe advances one page without interfering with vertical reading.
 box=view.locator('.library-page-content').bounding_box();page.mouse.move(box['x']+box['width']*.8,box['y']+70);page.mouse.down();page.mouse.move(box['x']+box['width']*.2,box['y']+70,steps=5);page.mouse.up();assert view.get_attribute('data-page')!=bookmark
 view.get_by_role('button',name='New note',exact=True).click();view.get_by_role('button',name='Next page',exact=True).click();assert view.locator('.library-memory').inner_text()=='✿ A year ago today';assert view.locator('.library-entry').inner_text()=='PRIVATE_LAST_AUTUMN'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert view.evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/library-pages-{phase}-{width}.png')
 view.get_by_role('button',name='Book cover',exact=True).click();assert view.get_attribute('data-page')=='cover';page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/library-cover-mobile.png')
 view.get_by_role('button',name='Close library',exact=True).click();assert not view.is_visible()
 page.evaluate('window.dispatchEvent(new Event("pagehide"))');page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.library.model.title')=='PRIVATE_QUIET_LIBRARY';assert page.evaluate('__lr.library.model.entries().some(p=>p.text==="PRIVATE_NEW_NOTE")')
 page.click('#bHome');page.locator('#homeView [data-app=library]').click();assert view.is_visible();assert view.get_attribute('data-page')=='cover';view.get_by_role('button',name='Open library book',exact=True).click();assert view.locator('.library-memory').is_visible();page.keyboard.press('Escape')
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'lectern' in raw;assert 'PRIVATE_' not in raw;assert 'bookmark' not in raw
 assert not errors,errors;print('PASS lectern cover, private title/notes, rich letters and scroll, bookmarked reopen/reload, swipe, year-ago flower, launcher, responsive themes and share privacy',flush=True)
 browser.close()
server.shutdown()
