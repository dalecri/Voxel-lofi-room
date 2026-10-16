"""npm run build && python3 tests/terrarium-browser.py. Real mobile taps use the existing portal path."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL='https://heycristobal.com/voxel-worlds/'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);context.add_init_script("localStorage.setItem('lr.intro','true')")
 external=[]
 def route(r):
  if r.request.url.startswith('http://127.0.0.1:'):r.continue_()
  else:external.append(r.request.url);r.abort()
 context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='Little worlds';a.meta.visitors=false;a.meta.mischief=false;a.meta.realtime=false;a.meta.dreamy=false;a.setMode('explore',true);window.terrariums=[];
 const owners=[['desk',{x:2,z:3}],['nightstand',{x:6,z:3}],['shelf',{k:0,u:6,e:1}]];
 owners.forEach(([t,o],c)=>{const owner=a.room.add(a.room.make(t,o)),it=a.room.make('terrarium',{p:owner.id,lx:0,lz:0,c});if(!a.room.canPlace(it))throw Error('Bad surface '+t);a.room.add(it);terrariums.push(it.id);});a.room.add(a.room.make('phone',{x:4,z:7}));a.changed();a.setPhase('day',true);a.view.zoomGoal=1.8;
 window.opened=[];window.open=(...args)=>{opened.push(args);return null;};}''')
 page.wait_for_function("__lr.widgets.destinations('terrarium').length===1")
 # Every variant uses an actual pointer hit on its own model, without toggling the screen state.
 for id in page.evaluate('terrariums'):
  pos=page.evaluate('''id=>{const v=__lr.view,p=v.root.localToWorld(v.itemPoint(id,[4,4,4])).project(v.cam),r=v.r.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}''',id)
  before=page.evaluate('opened.length');page.mouse.click(pos['x'],pos['y']);page.wait_for_function('n=>opened.length===n+1',arg=before)
  assert page.evaluate('opened.at(-1)')==[URL,'_blank','noopener,noreferrer']
  assert not page.evaluate('id=>__lr.room.get(id).on',id)
 page.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='phone').id)")
 tile=page.get_by_role('button',name='Voxel Worlds',exact=True);assert tile.count()==1;assert '🫙' in tile.inner_text();tile.click();assert page.evaluate('opened.at(-1)[0]')==URL
 page.keyboard.press('Escape');assert not page.locator('#sheet').evaluate("e=>e.classList.contains('open')")
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/terrarium-{width}.png')
 assert not errors,errors;assert not external,external
 print('PASS: all three variants on desk/table/shelf, actual mobile taps open exact Voxel Worlds URL with popup-safe flags, screen state untouched, launcher tile/icon, Escape, responsive widths, zero console errors or outbound fetches',flush=True)
 browser.close()
server.shutdown()
