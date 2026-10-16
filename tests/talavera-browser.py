"""npm run build && python3 tests/talavera-browser.py. Every palette in the normal placement/render path."""
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
 context=browser.new_context(reduced_motion='reduce',viewport={'width':1280,'height':900});context.add_init_script("localStorage.setItem('lr.intro','true')");context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.set_default_timeout(10000)
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=24;a.room.name='A Talavera casa';a.meta.visitors=false;a.meta.realtime=false;a.meta.dreamy=false;a.setMode('explore',true);
 const add=(t,o)=>{const it=a.room.make(t,o);if(!a.room.canPlace(it))throw Error('Placement failed: '+t);return a.room.add(it);};
 for(let c=0;c<3;c++){const x=c*8;
  const table=add('tavtable',{x:x+1,z:2,c}),side=add('tavside',{x:x+4,z:5,c});
  for(const [t,dx,z] of [['tavcoffee',1,5],['tavbench',1,8],['tavchair',4,8],['tavbed',5,2],['tavcabinet',1,10],['tavshelf',5,7],['tavplanter',5,11],['tavrug',0,4]])add(t,{x:x+dx,z,c});
  add('tavlamp',{p:side.id,lx:0,lz:0,c});add('tavmug',{p:table.id,lx:0,lz:0,c});add('tavvase',{p:table.id,lx:1,lz:0,c});add('tavplates',{k:0,u:x+1,e:3,c});add('tavmirror',{k:0,u:x+5,e:1,c});
 }a.changed();}''')
 assert page.evaluate('__lr.room.items.length')==45
 for c in range(3):
  assert page.evaluate('''c=>{const a=__lr,it=a.room.items.find(i=>i.t==='tavlamp'&&i.c===c);a.interact(it.id);if(it.on)return false;a.interact(it.id);return it.on&&a.view.objs.has(it.id);}''',c)
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(timeout=45000,path=f'/tmp/talavera-all-{phase}-{width}.png')
 # Closer views of each complete palette, keeping both the normal counter and new collection.
 for c in range(3):
  page.evaluate('''c=>{const a=__lr;a.room.items=a.room.items.filter(i=>i.c===c);for(const i of a.room.items){if(i.x!==undefined)i.x-=c*8;if(i.u!==undefined)i.u-=c*8;}a.room.n=10;a.room.add(a.room.make('mxcounter',{x:1,z:0,c}));a.changed();a.view.zoomGoal=1.4;}''',c) if c==0 else None
  if c>0:page.evaluate('''c=>{const a=__lr;for(const i of a.room.items)i.c=c;a.changed();}''',c)
  for phase in ['day','night']:
   page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
   for width in [390,1280]:
    page.set_viewport_size({'width':width,'height':900});page.screenshot(timeout=45000,path=f'/tmp/talavera-{c}-{phase}-{width}.png')
 page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()")
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');assert page.evaluate('__lr.room.items.filter(i=>LR.CAT[i.t].group==="talavera").length')==15
 assert not errors,errors
 print('PASS: all 45 models placed normally, surfaces/walls/rug and lamp toggles, complete palettes at desktop/mobile day/night, normal save/reload, no console errors',flush=True)
 browser.close()
server.shutdown()
