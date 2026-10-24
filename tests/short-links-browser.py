"""npm run build && python3 tests/short-links-browser.py. Short share links against a stand-in for the
lofi-rooms Supabase functions: share and copy a short link, the card QR holds it, a friend opens it,
pasted short links work, guest-book replies are short, Short link off or offline falls back to the full link."""
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
SITE='https://heycristobal.com/Voxel-lofi-room/'
INTRO="if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');}"
links={};calls=[]
def supabase(route):
 req=route.request;name=req.url.rsplit('/',1)[-1];body=json.loads(req.post_data or '{}');calls.append(name)
 assert req.headers.get('apikey','').startswith('sb_publishable_')
 if name=='shorten_room_link':
  code=body['p_code'];sid=next((k for k,v in links.items() if v==code),None) or f'{len(links)+1:08x}';links[sid]=code
  return route.fulfill(status=200,content_type='application/json',body=json.dumps(sid))
 if name=='room_link':return route.fulfill(status=200,content_type='application/json',body=json.dumps(links.get(body['p_id'])))
 return route.fulfill(status=404,body='{}')
def until(pg,expr,timeout=20):
 end=time.time()+timeout
 while time.time()<end:
  if pg.evaluate(expr):return
  pg.wait_for_timeout(150)
 raise AssertionError('timed out: '+expr)
def context(browser,online=True,**kw):
 ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844},**kw);ctx.add_init_script(INTRO)
 ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (supabase(r) if online and '.supabase.co/rest/v1/rpc/' in r.request.url else r.abort()))
 return ctx
def page_of(ctx):
 pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.set_default_timeout(20000);return pg,errors
# Read the card's QR the way the app checks it: the white tile where drawCard puts it (post card).
QR='''url=>new Promise(ok=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);
 const n=LRShareLinks.qrMatrix(url).length,cell=Math.max(2,Math.floor(320/(n+8))),size=cell*(n+8),x=1080-56-size-12,y=1350-56-size-12,px=g.getImageData(x,y,size+24,size+24);
 ok([LRRoomQR.decode(px.data,size+24,size+24),cell]);};i.src=document.querySelector('.share-card-img').src;})'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 ctx=context(browser,permissions=['clipboard-read','clipboard-write']);page,errors=page_of(ctx)
 page.goto(BASE,wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 page.evaluate('__lr.room.name="Short Den";__lr.changed()')
 # Short by default: the link, Copy link and the card's QR all carry #r/<id>.
 page.evaluate('__lr.shareSheet()');page.wait_for_selector('.share-card-img[src]')
 code=page.evaluate('__lr.roomCode()');sid=next(k for k,v in links.items() if v==code);short=SITE+'#r/'+sid
 assert page.locator('#bShortLink').is_checked() and 'Saved online' in page.locator('.share-short small').text_content()
 page.click('#bCopyLink');assert page.evaluate('navigator.clipboard.readText()')==short
 got,cell=page.evaluate(QR,short);assert got==short,(got,short);assert cell>=8,cell   # short links get chunky, easy-to-scan squares
 # The QR under More ways to share holds the short link by default, or the whole room on request.
 qr='''()=>{const c=document.querySelector('.room-qr-canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height);return [LRRoomQR.decode(p.data,c.width,c.height),c.dataset.holds,document.querySelector('.room-qr-plain').getAttribute('aria-pressed')];}'''
 page.click('.share-more summary');page.locator('.room-qr-canvas').wait_for()
 assert page.get_by_role('radio',name='Short link').get_attribute('aria-checked')=='true'
 assert page.evaluate(qr)==[short,'link','false'],page.evaluate(qr)
 small=page.evaluate('LRRoomQR.encodeLink(%r).matrix.length'%short);full=page.evaluate('LRRoomQR.encode(%r).matrix.length'%code);assert small*2<full,(small,full)
 page.get_by_role('radio',name='Full room code').click();assert page.evaluate(qr)[:2]==[code,'code'];assert 'no internet needed' in page.locator('.room-qr .muted').first.inner_text()
 page.get_by_role('radio',name='Short link').click();assert page.evaluate(qr)[:2]==[short,'link']
 # Sharing again reuses the id; nothing piles up.
 page.keyboard.press('Escape');page.evaluate('__lr.shareSheet()');page.wait_for_selector('.share-card-img[src]');assert len(links)==1
 # Short link off: the full link, and the shortener isn't asked.
 # Short link now lives under More ways to share, and switching it keeps that section open.
 page.click('.share-more summary');assert page.locator('#bShortLink').is_visible()
 before=len(calls);page.click('#bShortLink');until(page,'!document.querySelector("#bShortLink")?.checked && !document.querySelector("#bShortLink")?.disabled && !!document.querySelector(".share-card-img")?.src');assert page.locator('.share-more').get_attribute('open') is not None and page.locator('#bShortLink').is_visible()
 page.click('#bCopyLink');assert page.evaluate('navigator.clipboard.readText()')==SITE+'#'+code and len(calls)==before
 assert 'Nothing is stored online' in page.locator('.share-short small').text_content()
 page.click('#bShortLink');until(page,'document.querySelector("#bShortLink")?.checked && !document.querySelector("#bShortLink")?.disabled && !!document.querySelector(".share-card-img")?.src')
 page.keyboard.press('Escape');until(page,'!document.querySelector("#sheet.open")')
 # Closing while the link is being remade keeps it closed.
 page.evaluate('__lr.shareSheet()');page.wait_for_selector('.share-card-img[src]');page.click('.share-more summary');page.click('#bShortLink');page.keyboard.press('Escape');page.wait_for_timeout(800);assert page.locator('#sheet.open').count()==0
 page.evaluate("localStorage.setItem('lr.shortLinks','true')")
 # A pasted short link works in the code box.
 page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click();page.click('#bImportCode')
 page.locator('textarea.code').fill('Come see my room! '+short);page.click('#bOpenCode');page.wait_for_selector('.friend-card-view')
 assert not errors,errors;ctx.close()
 # A friend opens the short link in a fresh browser: looked up, then the room card arrives.
 friend=context(browser);fp,ferr=page_of(friend)
 fp.goto(BASE+'#r/'+sid,wait_until='networkidle');until(fp,'!!window.__lr?.dashboard')
 until(fp,'document.querySelector(".friend-card-info h3")?.textContent==="Short Den"');assert fp.evaluate('location.hash')==''
 fp.evaluate('document.querySelector(".friend-card-visit").click()');until(fp,'__lr.room.name==="Short Den"')
 # Their guest-book reply is a short link too, and opens as a note.
 fp.evaluate('__lr.signSheet()');fp.fill('input.gbname','Tyler');fp.click('#gbSign');fp.wait_for_selector('#gbCopyLink')
 assert any(v.startswith('LRG') for v in links.values())
 # A short link that leads nowhere says so.
 fp.evaluate("location.hash='#r/ffffffff'");until(fp,'[...document.querySelectorAll("#toasts .toast")].some(t=>t.textContent.includes("doesn’t lead"))')
 assert not ferr,ferr;friend.close()
 # Offline: the shortener can't be reached, so the share sheet uses the full link and says why.
 off=context(browser,online=False,permissions=['clipboard-read','clipboard-write']);op,oerr=page_of(off)
 op.goto(BASE,wait_until='networkidle');op.wait_for_function('!!window.__lr?.dashboard');op.evaluate('__lr.shareSheet()');op.wait_for_selector('.share-card-img[src]')
 assert 'Couldn’t reach' in op.locator('.share-short small').text_content();op.click('#bCopyLink');assert '#LR' in op.evaluate('navigator.clipboard.readText()')
 # No short link, so the QR holds the full room and offers no switch.
 op.click('.share-more summary');op.locator('.room-qr-canvas').wait_for();assert op.locator('.room-qr-source').count()==0 and op.evaluate("document.querySelector('.room-qr-canvas').dataset.holds")=='code'
 # Opening a short link offline explains instead of failing silently.
 op.keyboard.press('Escape');op.evaluate("location.hash='#r/'+'"+sid+"'");until(op,'[...document.querySelectorAll("#toasts .toast")].some(t=>t.textContent.includes("Couldn’t reach that short link"))')
 assert not oerr,oerr;off.close()
 print('PASS short links: short by default, reused id, card QR, short-link QR switch, Short link off, pasted short link, friend opens it, short guest-book reply, unknown and offline fallbacks')
 browser.close()
