"""npm run build && python3 tests/lane-browser.py. The Lane: the street of places replaces the Rooms tab.
Your house keeps the rooms content; Mallow's shelf sells with Fireflies; the Mail Room lists papers and letters;
the Notice Board reads the calendar; the away note is gentle and shown once; phone and desktop layouts."""
import functools,json,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/'
def until(pg,expr,timeout=20):
 end=time.time()+timeout
 while time.time()<end:
  if pg.evaluate(expr):return
  pg.wait_for_timeout(150)
 raise AssertionError('timed out: '+expr)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 # Four days away, an old saved 'Rooms' tab, and a purse with room for one find.
 ctx.add_init_script("""if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.menuTab',JSON.stringify('Rooms'));
  const d=n=>{const t=new Date();t.setDate(t.getDate()-n);return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;};
  localStorage.setItem('lr.lane',JSON.stringify({firstVisit:d(10),lastVisit:d(4)}));}""")
 ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 tomorrow=page.evaluate("(()=>{const t=new Date();t.setDate(t.getDate()+1);return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`})()")
 page.evaluate("d=>__lr.calendarModel.add({date:d,title:'PRIVATE_VET_VISIT'})",tomorrow)
 # The saved 'Rooms' tab lands on the Lane, at your house, with everything the Rooms tab had.
 page.click('#bMenu');lane=page.locator('#menu-lane');lane.locator('.lane-street').wait_for()
 assert page.get_by_role('tab',name='Lane',exact=True).get_attribute('aria-selected')=='true'
 assert lane.locator('.lane-front').count()==4 and lane.locator('.lane-front[data-place=house]').get_attribute('aria-selected')=='true'
 assert page.locator('#bShareCode').is_visible() and page.locator('#bImportCode').is_visible() and 'Your house' in lane.locator('.rooms-heading').inner_text()
 # Back after four days: one kind note, gone after Thanks and not shown again.
 away=lane.locator('.lane-away');assert 'away 4 days' in away.inner_text();away.get_by_role('button',name='Thanks').click();assert lane.locator('.lane-away').count()==0
 page.keyboard.press('Escape');page.click('#bMenu');page.locator('#menu-lane .lane-street').wait_for();assert page.locator('#menu-lane .lane-away').count()==0
 # Arrow keys walk the street like tabs.
 house=lane.locator('.lane-front[data-place=house]');house.focus();page.keyboard.press('ArrowRight');assert lane.locator('.lane-front[data-place=shop]').get_attribute('aria-selected')=='true'
 assert page.locator('#bShareCode').is_hidden() and lane.locator('#lane-shop').is_visible()
 # The Shop: Mallow, three finds (four on Sundays), bought with Fireflies, then gone from the shelf.
 page.evaluate("localStorage.setItem('lr.fireflies','30')");balance=page.evaluate('__lr.shop.balance')
 shelf=lane.locator('.lane-item');n=shelf.count();sunday=page.evaluate('new Date().getDay()===0');assert n==(4 if sunday else 3),n
 assert 'Mallow' in lane.locator('.lane-keeper').inner_text() and f'{balance} Fireflies' in lane.locator('.lane-purse').inner_text()
 cheapest=min(page.evaluate('[...document.querySelectorAll("#lane-shop .lane-item")].map(c=>LRShop.allCatalog.find(i=>i.id===c.dataset.item).price)'))
 page.evaluate('n=>__lr.shop.earn("streak")',0)   # +25: enough for at least the cheapest find
 lane.locator('.lane-front[data-place=house]').click();lane.locator('.lane-front[data-place=shop]').click()
 card=lane.locator('.lane-item').filter(has=page.locator('button:not([disabled])')).first;item=card.get_attribute('data-item');price=page.evaluate('id=>LRShop.allCatalog.find(i=>i.id===id).price',item)
 before=page.evaluate('__lr.shop.balance');card.get_by_role('button').click()
 until(page,f'__lr.shop.owns("{item}")');assert page.evaluate('__lr.shop.balance')==before-price
 assert lane.locator(f'.lane-item[data-item="{item}"]').count()==0,'a bought find leaves the shelf'
 poor=lane.locator('.lane-item button[disabled]')
 if poor.count():assert poor.first.get_attribute('title')=='Not enough Fireflies yet'
 # The Mail Room: today's paper opens the Daily Brief; Mallow's letters open and stay read.
 lane.locator('.lane-front[data-place=mail]').click();mail=lane.locator('#lane-mail')
 assert 'Today’s paper' in mail.inner_text();letter=mail.locator('.lane-row',has_text='Welcome to the lane');assert 'unread' in letter.get_attribute('class')
 letter.click();page.locator('#sheetBody .lane-letter').first.wait_for();assert 'Mallow' in page.locator('#sheetBody').inner_text()
 page.keyboard.press('Escape');page.click('#bMenu');page.locator('#menu-lane .lane-front[data-place=mail]').click()
 assert 'unread' not in page.locator('#lane-mail .lane-row',has_text='Welcome to the lane').get_attribute('class')
 page.locator('#lane-mail .lane-row',has_text='Today’s paper').click();page.wait_for_function('document.querySelector("#sheetBody h2")?.textContent.includes("brief")||document.querySelector("#sheetBody")?.textContent.includes("Brief")')
 # The Notice Board: tomorrow's calendar event is pinned; the sky line names the next solstice or equinox.
 page.keyboard.press('Escape');page.click('#bMenu');page.locator('#menu-lane .lane-front[data-place=notice]').click();board=page.locator('#lane-notice')
 assert 'PRIVATE_VET_VISIT' in board.locator('.lane-pin').inner_text() and ('solstice' in board.inner_text() or 'equinox' in board.inner_text())
 # Phone and desktop: the street fits, nothing scrolls sideways, in day and night.
 for phase in ['day','night']:
  page.evaluate(f"__lr.setPhase('{phase}',true)");page.keyboard.press('Escape');page.click('#bMenu');page.locator('#menu-lane .lane-street').wait_for()
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844})
   for place in ['house','shop','mail','notice']:
    page.locator(f'#menu-lane .lane-front[data-place={place}]').click()
    assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth'),(phase,width,place)
 assert 'lr.lane' not in json.dumps(page.evaluate('async()=>__lr.readCode(await __lr.roomCode())')),'lane state never travels in room codes'
 assert not errors,errors
 print('PASS lane: Rooms becomes the Lane at your house, gentle away note once, keyboard street, Mallow’s shelf with Fireflies, papers and letters, calendar notices, 320/390/1280 day/night')
 browser.close()
