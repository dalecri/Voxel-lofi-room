"""npm run build && python3 tests/motion-browser.py. Screens glide: sheet swaps, menu tabs, overlays, room travel; reduced motion stays still."""
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
FIX='''if(!sessionStorage.fx){sessionStorage.fx='1';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.meta':{current:101,visitors:false,realtime:false,dreamy:false,phase:'day'}}))localStorage.setItem(k,JSON.stringify(v));}'''
COUNT='()=>document.getAnimations().filter(a=>a.playState==="running"&&a.constructor.name==="Animation"&&(a.effect?.target?.closest?.("#sheetBody")||a.effect?.target?.id==="sheetBody")).length'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for reduced in [False,True]:
  context=browser.new_context(reduced_motion='reduce' if reduced else 'no-preference',viewport={'width':390,'height':844});context.add_init_script(FIX)
  context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
  settle=lambda:page.wait_for_function('('+COUNT+')()===0')
  page.click('#bMenu');settle()
  # Menu tabs drift in.
  page.get_by_role('tab',name='Rooms',exact=True).click();tab=page.evaluate(COUNT)
  settle()
  # Menu -> tool inside the open sheet: content and height glide.
  page.evaluate("__lr.roomToolsUI.open('tea',null)");swap=page.evaluate(COUNT);settle()
  # Same screen repainting stays still.
  page.evaluate("__lr.roomToolsUI.open('tea',null)");still=page.evaluate(COUNT);settle()
  # Tool -> Control Centre -> back to the menu.
  page.evaluate("__lr.habitsUI.openHome()");swap2=page.evaluate(COUNT);settle()
  page.evaluate("__lr.habitsUI.openNew()");swap3=page.evaluate(COUNT);settle()
  # Travel from the Rooms tab dims the room first.
  page.keyboard.press('Escape');settle();page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click();page.wait_for_timeout(300)
  page.locator('.rooms-card[data-room-id="102"] .rooms-visit').click();faded=page.evaluate('document.querySelector("#fade").classList.contains("on")')
  page.wait_for_function('__lr.meta.current===102');page.wait_for_function('!document.querySelector("#fade").classList.contains("on")')
  print('reduced' if reduced else 'motion',dict(tab=tab,swap=swap,still=still,swap2=swap2,swap3=swap3,faded=faded))
  if reduced:assert tab==0 and swap==0 and swap2==0 and not faded
  else:assert tab>=1 and swap>=2 and still==0 and swap2>=2 and swap3>=2 and faded
  assert not errors,errors;context.close()
 print('PASS motion: tabs drift, sheet screens glide, repaints stay still, menu travel fades, reduced motion is still')
 browser.close()
