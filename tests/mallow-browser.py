"""npm run build && python3 tests/mallow-browser.py — offline, synthetic owner data."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='no-preference')
 context.add_init_script("const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:['2026-10-18T12:00:00']))}static now(){return new RealDate('2026-10-18T12:00:00').getTime()}};localStorage.setItem('lr.intro','true');if(!localStorage.getItem('test.mallow')){localStorage.setItem('lr.fireflies','1000');localStorage.setItem('test.mallow','true')}")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print(str(e),flush=True)))
 page.route('https://gist.githubusercontent.com/**',lambda r:r.fulfill(json={'clips':[]}))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 page.evaluate('__lr.setMode("explore",true);__lr.openShop()');assert page.locator('.shop-sinks').count()==0
 page.click('#shopClose');page.evaluate('__lr.meta.visitors=true;__lr.tickWorld(200);__lr.openShop()')
 assert page.locator('.shop-card').count()==3
 assert page.evaluate('__lr.merchant.wares.filter(id=>LRShop.exclusives.some(c=>c.id===id)).length')==2
 special=page.evaluate('__lr.merchant.wares.find(id=>LRShop.exclusives.some(c=>c.id===id))')
 before=page.evaluate('__lr.shop.balance');price=page.evaluate('id=>LRShop.allCatalog.find(c=>c.id===id).price',special)
 page.locator(f'[data-shop-buy="{special}"]').click();assert page.evaluate('__lr.shop.balance')==before-price
 assert not page.evaluate('id=>__lr.merchant.wares.includes(id)',special)
 assert page.locator('.shop-card').count()==3
 assert page.evaluate('__lr.merchant.wares.filter(id=>LRShop.exclusives.some(c=>c.id===id)).length')==1
 before=page.evaluate('__lr.shop.balance')
 page.get_by_role('button',name='Tip Mallow 10 Fireflies',exact=True).click()
 assert page.evaluate('__lr.shop.balance')==before-10
 assert 'did a little spin' in page.locator('.shop-thanks').inner_text()
 assert page.evaluate('__lr.catJournal.entries[0].kind')=='tip'
 assert page.evaluate('__lr.calendarModel.activity().at(-1).events.includes("tip")')
 assert page.evaluate('__lr.view.objs.get(__lr.room.items.find(i=>i.t==="merchantcat").id).userData.petSpinUntil>__lr.view.t')
 page.evaluate('__lr.setPhase("day",true);__lr.view.setPhase("day",true);window.__beforeGild=__lr.view.sun.color.getHex()')
 before=page.evaluate('__lr.shop.balance');page.click('#shopGild')
 assert page.evaluate('__lr.shop.balance')==before-150
 assert page.evaluate('LRShop.isGilded(__lr.room) && __lr.view.sun.color.getHex()!==__beforeGild')
 assert page.locator('#shopGild').is_disabled()
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('code=>__lr.readCode(code)',code)
 assert 'gild' not in decoded and 'merchant' not in decoded and 'shopOwned' not in decoded
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');assert page.evaluate('LRShop.isGilded(__lr.room)')
 assert page.evaluate('id=>__lr.shop.owns(id)',special)
 page.evaluate('__lr.tickWorld(0);__lr.openShop()');assert page.locator('#shopGild').is_disabled()
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':844})
  for phase in ['day','night']:
   page.evaluate('p=>__lr.view.setPhase(p,true)',phase)
   page.locator('#shopGild').scroll_into_view_if_needed()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.locator('[data-shop-tip]').first.evaluate('e=>e.getBoundingClientRect().height>=44')
   page.screenshot(path=f'/tmp/mallow-{phase}-{width}.png')
 # A different room gets its own lighting; switching back restores the paid finish.
 assert page.evaluate('''() => {const a=__lr,data=a.room.serialize();a.room.load(new LR.Room().serialize());a.changed();a.view.setPhase('day',true);const plain=a.view.sun.color.getHex(),separate=!LRShop.isGilded(a.room);a.room.load(data);a.changed();a.view.setPhase('day',true);return separate && plain!==a.view.sun.color.getHex() && LRShop.isGilded(a.room);}''')
 # Repainting uses the real paint flow, even when choosing the same finish.
 page.click('#shopClose');page.evaluate('__lr.state.tool="paint";__lr.setMode("edit",true)')
 page.locator('.swatch').first.click();assert page.evaluate('!LRShop.isGilded(__lr.room) && !__lr.room.gild')
 assert not errors,errors
 print('PASS: traveling exclusives, buy/reload, tip + diary/activity, gild/reload/room scoping/repaint/privacy, mobile and desktop day/night')
 browser.close()
server.shutdown()
