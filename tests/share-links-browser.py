"""npm run build && python3 tests/share-links-browser.py. Share links and the picture card: card renders with a QR of the link (post and story) and the app icon, every way in, visitor guest book pill, sharing a friend's room, shared cards kept in Photos and the Open door moment, From name on the friend's card, Copy link, opening a link in a fresh browser lands on the friend card, Android banner."""
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
# Full links, fully offline (short links have their own test with a stand-in shortener).
INTRO="if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.shortLinks','false');}"
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844},permissions=['clipboard-read','clipboard-write']);ctx.add_init_script(INTRO)
 ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(20000)
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 page.evaluate('__lr.room.name="Share Den";__lr.changed()')
 page.evaluate('__lr.shareSheet()');page.wait_for_selector('.share-card-img[src]')
 # No name yet: a quiet invite to add one. Adding it puts "From Cris" under the buttons and in the link.
 assert page.locator('.share-from').inner_text().startswith('Add your name')
 page.click('#bFromEdit');page.fill('#fromName','Cris');page.click('#bFromSave');until(page,'document.querySelector(".share-from b")?.textContent==="Cris" && !!document.querySelector(".share-card-img")?.src')
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.guestName"))')=='Cris'
 # The Short link setting sits folded under More ways to share, not under the main buttons.
 assert page.locator('#bShortLink').count()==1 and not page.locator('#bShortLink').is_visible()
 code=page.evaluate('__lr.roomCode()');link='https://heycristobal.com/Voxel-lofi-room/#'+code
 assert page.locator('textarea.code').input_value()==code and page.locator('#bShareCard').is_enabled()
 # Cancelling the share sheet keeps nothing and unlocks nothing.
 page.evaluate('''()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});window.sent=[];window.cancelShare=true;
  Object.defineProperty(navigator,'share',{configurable:true,value:async o=>{if(window.cancelShare)throw new DOMException('cancelled','AbortError');window.sent.push(o);}});}''')
 photos=lambda:page.evaluate('__lr.files.list("Photos").length')
 before=photos();page.click('#bShareCard');page.wait_for_timeout(600)
 assert photos()==before and 'shared' not in page.evaluate('JSON.parse(localStorage.getItem("lr.found")||"[]")')
 # Sending the card keeps a JPEG copy in Files › Photos (once) and unlocks the Open door moment.
 page.evaluate('window.cancelShare=false');page.click('#bShareCard');until(page,'window.sent.length===1')
 until(page,f'__lr.files.list("Photos").length==={before+1}')
 kept=page.evaluate('__lr.files.list("Photos")[0]');assert kept['data'].startswith('data:image/jpeg') and 'post card' in kept['title'],kept['title']
 until(page,'JSON.parse(localStorage.getItem("lr.found")||"[]").includes("shared")')
 page.click('#bShareCard');until(page,'window.sent.length===2');page.wait_for_timeout(600);assert photos()==before+1
 page.click('#bCopyLink');assert page.evaluate('navigator.clipboard.readText()')==link
 # The QR on the card is the same link.
 decoded=page.evaluate('''()=>new Promise(ok=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const x=640,y=880,w=440,h=470,d=g.getImageData(x,y,w,h);ok(jsQR(d.data,w,h)?.data||null);};i.src=document.querySelector('.share-card-img').src;})''')
 assert decoded==link,decoded
 assert page.evaluate('document.querySelector(".share-card-img").naturalWidth')==1080
 # The sign-off carries the app icon (its glowing window), not just the sky.
 # (the icon sits in a 60px square at the bottom left; its window glows warm, never the purple sky)
 warm=page.evaluate('''()=>new Promise(ok=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const d=g.getImageData(60,1294-56,60,60).data;let n=0;for(let k=0;k<d.length;k+=4)if(d[k]>200&&d[k+1]>190&&d[k+2]<d[k]-30)n++;ok(n);};i.src=document.querySelector('.share-card-img').src;})''')
 assert warm>40,warm
 # The card's QR wears the voxel QR theme (blossom greens and pinks), and repaints when the theme changes.
 tint='''t=>new Promise(ok=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const d=g.getImageData(700,950,360,360).data;let green=0,blue=0;for(let k=0;k<d.length;k+=4){if(d[k+1]>d[k]+40&&d[k+1]>d[k+2])green++;if(d[k+2]>d[k]+60&&d[k+2]>d[k+1]+20)blue++;}ok([green,blue]);};i.src=document.querySelector('.share-card-img').src;})'''
 green,blue=page.evaluate(tint,0);assert green>2000 and blue<200,(green,blue)
 page.click('.share-more summary');page.click('.room-qr-theme[data-theme=frost]');until(page,'!!document.querySelector(".share-card-img")?.src && !document.querySelector("#bShareCard").disabled')
 green,blue=page.evaluate(tint,0);assert blue>2000 and green<200,(green,blue)
 page.click('.room-qr-theme[data-theme=blossom]');until(page,'!!document.querySelector(".share-card-img")?.src && !document.querySelector("#bShareCard").disabled');page.click('.share-more summary')
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
 # The friend sees who it's from, warm words, and a card tucked in its envelope.
 assert fp.locator('#sheetBody h2').first.inner_text()=='A room from Cris' and fp.locator('.friend-card-eyebrow').inner_text()=='AN INVITATION FROM CRIS'
 until(fp,'document.querySelector(".friend-card-status")?.textContent.startsWith("Step inside")');assert fp.locator('.friend-envelope-front').count()==1
 assert fp.evaluate('location.hash')=='';assert fp.locator('.app-open-banner').count()==0
 fp.evaluate('document.querySelector(".friend-card-visit").click()');until(fp,'__lr.room.name==="Share Den"')
 # The visitor's guest book pill stands out and pulses until they sign, then calms down.
 until(fp,'!document.querySelector("#bGuest").hidden');g=fp.locator('#bGuest')
 assert 'nudge' in g.get_attribute('class') and g.inner_text().strip()=='✍ Sign guest book',g.inner_text()
 g.click();fp.wait_for_selector('#gbSign');assert 'reply link' in fp.locator('#gbSign').inner_text()
 # All eight stickers sit on one row, even on a 390px phone.
 assert fp.evaluate('new Set([...document.querySelectorAll(".stickers .stk")].map(b=>b.offsetTop)).size')==1 and fp.locator('.stickers .stk').count()==8
 fp.fill('input.gbname','Tyler');fp.click('#gbSign');fp.wait_for_selector('#gbCopyLink')
 # The long note code is folded away under "Send the code instead".
 assert fp.locator('#sheetBody textarea.code').is_hidden() and fp.locator('.share-more summary').inner_text().startswith('Send the code instead')
 until(fp,'document.querySelector("#bGuest").classList.contains("signed")');assert 'nudge' not in g.get_attribute('class') and g.inner_text().strip()=='✓ Signed'
 fp.keyboard.press('Escape');fp.reload(wait_until='networkidle');until(fp,'!!window.__lr?.dashboard');until(fp,'document.querySelector("#bGuest").classList.contains("signed")')
 # Sharing while visiting passes the friend's room on as "this room", and offers your own instead.
 fp.evaluate('__lr.shareSheet()');fp.wait_for_selector('.share-card-img[src]')
 assert 'visiting a friend' in fp.locator('#sheetBody > p.muted').first.inner_text() and fp.locator('#bShareOwn').is_visible()
 fp.click('#bShareOwn')
 if fp.locator('#lvDrop').count():fp.click('#lvDrop')
 until(fp,'__lr.room.name!=="Share Den"');fp.wait_for_selector('.share-card-img[src]');assert fp.locator('#bShareOwn').count()==0
 assert 'visiting a friend' not in fp.locator('#sheetBody > p.muted').first.inner_text()
 assert not ferr,ferr;friend.close()
 # Android browser: the room opens and a slim bar offers the installed app.
 droid=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844},user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36');droid.add_init_script(INTRO)
 droid.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 dp=droid.new_page();dp.set_default_timeout(20000);dp.goto(BASE+'#'+code,wait_until='networkidle');until(dp,'!!window.__lr?.dashboard')
 until(dp,'!!document.querySelector(".app-open-banner a")');assert dp.evaluate('document.querySelector(".app-open-banner a").getAttribute("href")')==f'intent://open?c={code}#Intent;scheme=lofirooms;package=com.lofirooms.app;end'
 until(dp,'!!document.querySelector(".friend-card-view")')
 print('PASS share links: picture card with a scannable link, Copy link, fresh browser opens the friend card, Android app bar, pasted links work')
 browser.close()
