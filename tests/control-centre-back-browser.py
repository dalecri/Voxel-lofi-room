"""Build www first. Control Centre reuses the real shared sheet and close paths."""
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
 context=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.getItem('sheetFixture')){localStorage.setItem('sheetFixture','true');const r={v:1,name:'Tools room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.fulfill(body='<rss><channel/></rss>',content_type='application/xml'))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');page.evaluate('__lr.renderLoop.stop()')
 home=page.locator('#homeView');body=page.locator('#sheetBody');back=page.get_by_role('button',name='Back to Control Centre',exact=True)
 def open_home():page.click('#bHome');home.wait_for()
 def launch(app):
  home.locator('.home-search').fill('');home.locator('[data-app='+app+']').click();back.wait_for();assert_header()
 def assert_header():
  row=page.locator('.control-return-actions,[data-control-header].has-control-return');assert row.count()==1
  b=back.bounding_box();x=row.locator('.sheet-close,.french-close,.library-close,.barnaby-close,.cozy-pop-close,#shopClose,#crownClose,#photoClose').first.bounding_box();r=row.bounding_box()
  assert abs(b['y']-x['y'])<=1 and b['x']<x['x'],(b,x)
  assert abs(b['x']-r['x'])<=1 and abs(x['x']+x['width']-r['x']-r['width'])<=1
  if row.locator('h2').count():
   t=row.locator('h2').bounding_box();assert abs(t['x']+t['width']/2-r['x']-r['width']/2)<=1;assert abs(t['y']+t['height']/2-b['y']-b['height']/2)<=1
  if body.locator(':scope > .menu-nav').count():assert row.bounding_box()['y']+row.bounding_box()['height']<=body.locator(':scope > .menu-nav').bounding_box()['y']+1
 def returned(app,query=''):
  back.click();home.wait_for();assert page.evaluate('__lr.home.active');assert home.locator('.home-search').input_value()==query;assert home.locator('[data-app='+app+']').evaluate('e=>e===document.activeElement');assert back.count()==0
 open_home();page.wait_for_function('[...document.querySelectorAll("[data-app=mailbox] .mail-access-icon,[data-app=letters] .mail-access-icon")].length===2 && [...document.querySelectorAll("[data-app=mailbox] .mail-access-icon,[data-app=letters] .mail-access-icon")].every(i=>i.complete&&i.naturalWidth>0)');home.locator('.home-search').fill('French');home.locator('[data-app=french]').click();back.wait_for();assert page.evaluate('__lr.french.active');returned('french','French')
 # Long menu position and the launching tile survive a round trip.
 home.locator('.home-search').fill('');home.locator('[data-app=calendar]').scroll_into_view_if_needed();top=body.evaluate('e=>e.scrollTop');home.locator('[data-app=calendar]').click();back.wait_for();returned('calendar');assert abs(body.evaluate('e=>e.scrollTop')-top)<2
 # Sheet rebuilds and nested views keep the contextual button.
 launch('groceries');page.get_by_role('textbox',name='Add groceries',exact=True).fill('RETURN_MENU_MILK');page.get_by_role('button',name='Add to list',exact=True).click();back.wait_for();returned('groceries')
 launch('typewriter');page.locator('#letterBody').fill('RETURN_MENU_DRAFT');returned('typewriter');assert page.evaluate('__lr.letters.model.get().body.includes("RETURN_MENU_DRAFT")')
 launch('french');page.evaluate('__lr.calendar.openDay("2026-10-20")');back.wait_for();page.evaluate('__lr.french.open()');back.wait_for();assert_header();assert page.get_by_role('button',name='Close French corner',exact=True).is_visible();returned('french')
 launch('french');back.focus();page.keyboard.press('Tab');assert page.get_by_role('button',name='Close French corner',exact=True).evaluate('e=>e===document.activeElement');page.keyboard.press('Shift+Tab');assert back.evaluate('e=>e===document.activeElement');returned('french')
 launch('typewriter');page.get_by_role('button',name='Letters',exact=True).click();back.focus();page.keyboard.press('Tab');assert page.locator('#letterMailbox').evaluate('e=>e===document.activeElement');page.keyboard.press('Tab');assert page.locator('#letterClose').evaluate('e=>e===document.activeElement');returned('typewriter')
 launch('library');page.get_by_role('button',name='Open folder',exact=True).click();back.wait_for();returned('library')
 # Close/Escape keep their room destination; subsequent furniture tools get no Back.
 launch('french');page.get_by_role('button',name='Close French corner',exact=True).click();page.wait_for_function('!__lr.french.active && !document.querySelector(".control-back")');page.evaluate('__lr.french.open()');assert back.count()==0;page.keyboard.press('Escape');open_home()
 launch('tea');page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".control-back")');page.evaluate('__lr.roomToolsUI.open("groceries")');assert back.count()==0;page.keyboard.press('Escape');open_home()
 # Utility destinations also return to Home, restoring their control's focus.
 body.get_by_role('button',name='Open Settings',exact=True).click();back.wait_for();back.click();home.wait_for();assert body.get_by_role('button',name='Open Settings',exact=True).evaluate('e=>e===document.activeElement')
 body.get_by_role('button',name='Set room shortcut',exact=True).click();back.wait_for();back.click();home.wait_for();assert body.get_by_role('button',name='Set room shortcut',exact=True).evaluate('e=>e===document.activeElement')
 # External apps retain the source menu while the browser handles the other page.
 page.evaluate('window.open=(...args)=>{window.externalOpened=args}');external=home.locator('[data-app^="portal:"]').first;assert external.count();external.click();assert home.is_visible();assert page.evaluate('__lr.home.active');assert page.evaluate('!!window.externalOpened');assert back.count()==0
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900})
   for app in ['tea','french','sound','library','typewriter','tally','whiteboard','groceries','ideas','mailbox']:
    launch(app);assert back.bounding_box()['width']>=44;assert back.bounding_box()['height']>=44;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/control-back-{app}-{phase}-{width}.png');returned(app)
 page.set_viewport_size({'width':390,'height':400});launch('typewriter');assert page.locator('#letterScroll').bounding_box()['height']>=40;assert page.locator('#letterSend').bounding_box()['y']+page.locator('#letterSend').bounding_box()['height']<=400;returned('typewriter');page.set_viewport_size({'width':1280,'height':900})
 # Every built-in Control Centre app supplies the same return path.
 for app in home.locator('[data-app]').evaluate_all('es=>es.map(e=>e.dataset.app).filter(id=>!id.startsWith("portal:"))'):
  launch(app);returned(app)
 assert not errors,errors;browser.close()
server.shutdown()
print('PASS contextual Back: search/scroll/focus restore, nested rerenders, French/library/letters/tools/settings/shortcut, draft save, room close/Escape isolation, external apps, day/night phone/desktop layouts')
