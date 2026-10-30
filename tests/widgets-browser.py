"""Build www first. Retired news/library/links stay gone, even with legacy rooms and caches."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.retiredFixture){localStorage.retiredFixture='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({phase:'day',realtime:false,music:false,sound:false,visitors:false,liveWeather:false,liveExtras:false,calmPerformance:true}));localStorage.setItem('lr.library',JSON.stringify({title:'Old library',notes:[{id:'old',text:'PRIVATE_ARCHIVED_NOTE'}]}));localStorage.setItem('lr.widgets',JSON.stringify({newspaper:{headlines:[{title:'PRIVATE_CACHED_NEWS',url:'https://www.cbc.ca/news/old'}]},'pomodoro-candle':{url:'https://heycristobal.com/pomodoro-terrarium/'},'app-portals':{portals:[{furnitureId:'terrarium',label:'Voxel Worlds',url:'https://heycristobal.com/voxel-worlds/'}]}}));}''')
 external=[];context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (external.append(r.request.url),r.abort())[-1])
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def ready():page.wait_for_function('!!window.__lr?.widgets');page.evaluate('__lr.renderLoop.stop()')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();archived=page.evaluate('localStorage.getItem("lr.library")')
 page.evaluate('''()=>{const a=__lr;a.room.items=[];for(const [i,t] of ['lectern','newspaper','pomodorocandle','terrarium','gamingdesk','libcase','frenchdesk','morningpaper'].entries())a.room.add(a.room.make(t,{x:i%4*2,z:Math.floor(i/4)*4}));a.changed();window.opened=[];window.open=(...args)=>opened.push(args);a.widgetView.frame();a.widgets.refresh(a.room.items.map(i=>i.t));}''')
 assert page.evaluate('typeof LRLibrary')=='undefined';assert page.evaluate('typeof __lr.library')=='undefined';assert page.evaluate('typeof __lr.newspaperSheet')=='undefined';assert page.locator('#libraryView').count()==0
 for kind in ['newspaper','pomodorocandle','terrarium','libcase','gamingdesk']:
  assert page.evaluate('t=>!LRWidgets.attached(t)&&__lr.widgets.destinations(t).length===0',kind)
 for kind in ['lectern','newspaper','pomodorocandle','terrarium','gamingdesk']:
  page.evaluate('t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id)',kind);assert not page.locator('#sheet').evaluate('e=>e.classList.contains("open")');assert page.evaluate('opened.length')==0
 page.click('#bHome');apps=page.locator('#homeView');assert apps.locator('[data-app=library],[data-app=newspaper]').count()==0
 labels=apps.inner_text();assert all(label not in labels for label in ['My Library','Newspaper','Pomodoro Terrarium','Portfolio','QR Code generator','Voxel Worlds']);assert apps.locator('[data-app=notebook],[data-app=digest]').count()==2
 search=page.get_by_role('searchbox',name='Find a tool or app');search.fill('My Library');assert apps.locator('[data-app]').count()==0;page.keyboard.press('Escape');page.keyboard.press('Escape')
 page.evaluate('__lr.dashboard.launcher()');assert all(label not in page.locator('#sheetBody').inner_text() for label in ['Pomodoro Terrarium','Portfolio','QR Code generator','Voxel Worlds']);page.keyboard.press('Escape')
 page.evaluate('__lr.interact(__lr.room.items.find(i=>i.t==="morningpaper").id)');assert page.locator('.drift-reader').is_visible();page.keyboard.press('Escape')
 page.evaluate('__lr.widgetView.frame()');assert page.evaluate('(()=>{const it=__lr.room.items.find(i=>i.t==="frenchdesk");return __lr.view.objs.get(it.id).getObjectByName("widget:fridge-note")!==undefined})()')
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'newspaper' in raw and 'lectern' in raw and 'PRIVATE_' not in raw
 page.reload(wait_until='networkidle');ready();assert page.evaluate('localStorage.getItem("lr.library")')==archived;assert 'PRIVATE_CACHED_NEWS' not in page.evaluate('JSON.stringify(__lr.widgets.state)');assert not external,external;assert not errors,errors
 print('PASS removed news, My Library and four outbound apps; inert legacy decor, no news fetch/restore, private notes retained, French and Daily Brief intact')
 browser.close()
server.shutdown()
