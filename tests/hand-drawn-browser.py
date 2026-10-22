"""npm run build && python3 tests/hand-drawn-browser.py. Hand-drawn wobble: Settings toggle, saved, always still, UI untouched."""
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
 for reduced in [False,True]:
  context=browser.new_context(reduced_motion='reduce' if reduced else 'no-preference',viewport={'width':390,'height':844})
  context.add_init_script("if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');}")
  context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
  canvas=page.locator('#c');assert canvas.evaluate('e=>e.style.filter')=='';assert page.evaluate('document.body.classList.contains("hand-drawn")') is False
  # Settings › Look toggle.
  page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click()
  row=page.locator('#menu-settings .toggle',has_text='Hand-drawn wobble');assert row.count()==1;row.click()
  assert page.evaluate('document.body.classList.contains("hand-drawn")');assert page.evaluate('JSON.parse(localStorage.getItem("lr.meta")).handDrawn') is True
  assert page.locator('#lr-wobble-0').count()==1 and page.locator('#paperGrain').count()==1
  # The interface is never filtered; only the room canvas is.
  for sel in ['header','#sheetBody','#bMenu']:assert page.locator(sel).first.evaluate('e=>getComputedStyle(e).filter')=='none'
  first=canvas.evaluate('e=>e.style.filter');assert first.startswith('url(')
  page.wait_for_timeout(600);later=canvas.evaluate('e=>e.style.filter')
  assert later==first=='url("#lr-wobble-0")','the sketch stays still'
  # Survives a reload, then switches off cleanly.
  page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard');assert page.evaluate('document.body.classList.contains("hand-drawn")')
  page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click();page.locator('#menu-settings .toggle',has_text='Hand-drawn wobble').click()
  assert canvas.evaluate('e=>e.style.filter')=='';assert page.evaluate('document.body.classList.contains("hand-drawn")') is False
  assert not errors,errors;context.close()
 print('PASS hand-drawn wobble: settings toggle saves, room-only filter, stays still with or without reduced motion, switches off')
 browser.close()
