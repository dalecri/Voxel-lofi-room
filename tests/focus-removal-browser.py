"""npm run build && python3 tests/pixel-maker-browser.py. Retired focus candle migration and decorative former portal."""
import functools,json
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
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script('''if(!sessionStorage.houseFixture){sessionStorage.houseFixture='true';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.draft':{id:102,base:'',data:{...b,name:'Living draft restored'}},'lr.mainBedroom':101,'lr.meta':{current:102,visitors:false,realtime:false,dreamy:false,phase:'day',stations:[{name:'Old station',url:'https://example.com/old.mp3'}]}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 context.add_init_script("if(!sessionStorage.focusFixture){sessionStorage.focusFixture='true';const key='lr.room.101',room=JSON.parse(localStorage.getItem(key));room.items=[{id:20,t:'focuscandle',x:2,z:2,c:1,on:true}];localStorage.setItem(key,JSON.stringify(room));localStorage.setItem('lr.focusRituals',JSON.stringify({'101:20':{room:101,id:20,start:Date.now(),end:Date.now()+1500000}}));localStorage.setItem('lr.appShortcut',JSON.stringify('focus'));}")
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 assert page.evaluate('!LR.CAT.focuscandle && !LRLauncher.TOOLS.some(t=>t.id==="focus")')
 assert page.evaluate('__lr.room.get(20).t')=='candle'
 assert page.evaluate('localStorage.getItem("lr.focusRituals")') is None
 assert page.evaluate('localStorage.getItem("lr.appShortcut")') is None
 assert page.locator('#bAppShortcut').get_attribute('aria-label')=='Choose room shortcut'
 page.evaluate('__lr.updateRituals();__lr.todayUI.refresh()');assert page.locator('[data-timer=focus]').count()==0
 page.evaluate('window.opened=[];window.open=(...args)=>opened.push(args)')
 for width in [390,1280]:
  page.set_viewport_size({'width':width,'height':844});page.click('#bHome');assert page.locator('#homeView [data-app=focus]').count()==0
  assert page.locator('#homeView [data-app]').filter(has_text='Pomodoro Terrarium').count()==0;page.keyboard.press('Escape')
 page.evaluate("const it=__lr.room.add(__lr.room.make('pomodorocandle',{x:4,z:4}));__lr.changed();__lr.interact(it.id)")
 assert page.evaluate('opened.length')==0
 assert page.locator('#focusSnuff').count()==0
 assert not errors,errors;print('PASS focus removed from catalog/apps/badges, legacy timers and shortcut cleared, placed candles migrate, retired Pomodoro has no link at mobile/desktop widths',flush=True)
 browser.close()
server.shutdown()
