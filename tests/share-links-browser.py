"""npm run build && python3 tests/share-links-browser.py. Share links and the picture card: card renders with a QR of the link (post and story), every way in, Copy link, opening a link in a fresh browser lands on the friend card, Android banner."""
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
BASE=f'http://127.0.0.1:{server.server_port}/'
import time
def until(pg,expr,timeout=20):
 end=time.time()+timeout
 while time.time()<end:
  if pg.evaluate(expr):return
  pg.wait_for_timeout(150)
 raise AssertionError('timed out: '+expr)
INTRO="if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');}"
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844},permissions=['clipboard-read','clipboard-write']);ctx.add_init_script(INTRO)
 ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(20000)
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 page.evaluate('__lr.room.name="Share Den";__lr.changed()')
 page.evaluate('__lr.shareSheet()');page.wait_for_selector('.share-card-img[src]')
 code=page.evaluate('__lr.roomCode()');link='https://heycristobal.com/Voxel-lofi-room/#'+code
 assert page.locator('textarea.code').input_value()==code and page.locator('#bShareCard').is_enabled()
 page.click('#bCopyLink');assert page.evaluate('navigator.clipboard.readText()')==link
 # The QR on the card is the same link.
 decoded=page.evaluate('''()=>new Promise(ok=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const x=640,y=880,w=440,h=470,d=g.getImageData(x,y,w,h);ok(jsQR(d.data,w,h)?.data||null);};i.src=document.querySelector('.share-card-img').src;})''')
 assert decoded==link,decoded
 assert page.evaluate('document.querySelector(".share-card-img").naturalWidth')==1080
 # The code and QR wait, folded, under the main share.
 assert page.locator('.share-more').get_attribute('open') is None and page.locator('.room-qr-canvas').is_hidden()
 # Story: a 9:16 card with the same scannable link, and the choice is remembered.
 page.get_by_role('radio',name='Story 9:16').click();until(page,'document.querySelector(".share-card-img")?.naturalHeight===1920')
 assert page.locator('.share-card').get_attribute('data-format')=='story' and page.locator('#bShareCard').is_enabled()
 decoded=page.evaluate('''()=>new Promise(ok=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const x=640,y=1150,w=440,h=500,d=g.getImageData(x,y,w,h);ok(jsQR(d.data,w,h)?.data||null);};i.src=document.querySelector('.share-card-img').src;})''')
 assert decoded==link,decoded
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.shareFormat"))')=='story'
 page.get_by_role('radio',name='Post 4:5').click();until(page,'document.querySelector(".share-card-img")?.naturalHeight===1350')
 # Every way in: the top-bar chip, the photo overlay, and the top of the Rooms tab.
 page.keyboard.press('Escape');page.click('#bShare');page.wait_for_selector('.share-card-img[src]');page.keyboard.press('Escape')
 page.click('#bPhoto');page.wait_for_selector('#photo.open');page.click('#photoShareLink');page.wait_for_selector('.share-card-img[src]');assert page.locator('#photo.open').count()==0
 page.keyboard.press('Escape');page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click()
 assert page.evaluate('(()=>{const s=document.querySelector("#bShareCode"),v=document.querySelector("#menu-rooms .roomstack, #menu-rooms .village, #menu-rooms .hroom");return !v||!!(s.compareDocumentPosition(v)&Node.DOCUMENT_POSITION_FOLLOWING);})()')
 page.click('#bShareCode');page.wait_for_selector('.share-card-img[src]')
 assert not errors,errors
 # A pasted whole link works in the code box too.
 page.keyboard.press('Escape');page.evaluate('__lr.openSharedCode(null)');page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click();page.click('#bImportCode')
 page.locator('textarea.code').fill('Come see my room! '+link);page.click('#bOpenCode');page.wait_for_selector('.friend-card-view')
 assert not errors,errors;ctx.close()
 # A friend opens the link in a fresh browser: the room card arrives and the address bar is tidied.
 friend=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844});friend.add_init_script(INTRO)
 friend.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 fp=friend.new_page();ferr=[];fp.on('pageerror',lambda e:ferr.append(str(e)));fp.set_default_timeout(20000)
 fp.on('console',lambda m:ferr.append(m.text) if m.type=='error' else None);fp.goto(BASE+'#'+code,wait_until='networkidle')
 until(fp,'!!window.__lr?.dashboard')
 until(fp,'!!document.querySelector(".friend-card-view")');until(fp,'document.querySelector(".friend-card-info h3")?.textContent==="Share Den"')
 assert fp.evaluate('location.hash')=='';assert fp.locator('.app-open-banner').count()==0
 fp.evaluate('document.querySelector(".friend-card-visit").click()');until(fp,'__lr.room.name==="Share Den"')
 assert not ferr,ferr;friend.close()
 # Android browser: the room opens and a slim bar offers the installed app.
 droid=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844},user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36');droid.add_init_script(INTRO)
 droid.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 dp=droid.new_page();dp.set_default_timeout(20000);dp.goto(BASE+'#'+code,wait_until='networkidle');until(dp,'!!window.__lr?.dashboard')
 until(dp,'!!document.querySelector(".app-open-banner a")');assert dp.evaluate('document.querySelector(".app-open-banner a").getAttribute("href")')==f'intent://open?c={code}#Intent;scheme=lofirooms;package=com.lofirooms.app;end'
 until(dp,'!!document.querySelector(".friend-card-view")')
 print('PASS share links: picture card with a scannable link, Copy link, fresh browser opens the friend card, Android app bar, pasted links work')
 browser.close()
