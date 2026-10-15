"""npm run build && python3 tests/companion-activities-browser.py. Accelerated active room time, local assets."""
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
 context=browser.new_context(viewport={'width':900,'height':850})
 context.add_init_script("window.__hour=18;const RealDate=Date;window.Date=class extends RealDate{getHours(){return window.__hour}};localStorage.setItem('lr.intro','true');")
 page=context.new_page();errors=[];external=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 page.evaluate('''() => {
  window.setupBot=(kind,rotation=0)=>{
   const a=__lr;a.room.items=[];a.room.n=10;a.meta.current++;a.meta.weather='clear';a.meta.phase=__hour<5?'night':__hour<12?'morning':__hour>=18?'evening':'day';a.setMode('explore',true);
   if(kind==='desk'){const d=a.room.add(a.room.make('desk',{x:4,z:3,r:rotation}));a.room.add(a.room.make('computer',{p:d.id,lx:0,lz:0,on:true}));}
   if(kind==='read'){a.room.add(a.room.make('bookshelf',{x:4,z:1,r:rotation}));a.room.add(a.room.make('armchair',{x:2,z:5,r:rotation}));}
   if(kind==='floor')a.room.add(a.room.make('bookshelf',{x:4,z:1}));
   if(kind==='lounge'){a.room.add(a.room.make('armchair',{x:4,z:2}));a.room.add(a.room.make('mug',{x:6,z:3}));}
   if(kind==='bed')a.room.add(a.room.make('bed',{x:3,z:1}));
   if(kind==='music'){a.room.add(a.room.make('record',{x:4,z:2,on:true}));a.view.music=true;}
   if(kind==='tea')a.room.add(a.room.make('kettle',{x:4,z:2}));
   a.changed();a.companion.frame(.1);window.__decor=JSON.stringify(a.room.serialize());
  };
  window.advanceBot=seconds=>{for(let k=0;k<seconds*10;k++)__lr.companion.frame(.1);};
 }''')
 for rotation in range(4):
  page.evaluate('r=>setupBot("desk",r)',rotation);page.evaluate('advanceBot(59)')
  assert page.evaluate('__lr.companion.brain.state.mode')=='type'
  assert page.evaluate('''() => {
   const s=__lr.companion.brain.state,focus=s.activity.target,angle=Math.atan2(focus.x-s.x,focus.z-s.z);
   return Math.abs(angle-s.heading)<.001 && __lr.view.walk[Math.floor(s.z)*10+Math.floor(s.x)]===1 && s.activity.remaining>3600;
  }''')
  assert page.evaluate('__lr.companion.object.userData.parts.legs.rotation.x') < -1
  assert page.evaluate('__lr.companion.object.userData.parts.leftarm.rotation.x') < -1
  assert page.evaluate('JSON.stringify(__lr.room.serialize())===__decor')
 page.evaluate('''() => {window.__spot=[__lr.companion.brain.state.x,__lr.companion.brain.state.z];window.__changes=0;let last=__lr.companion.brain.state.activity;for(let k=0;k<3000;k++){__lr.companion.frame(.1);if(last!==__lr.companion.brain.state.activity){__changes++;last=__lr.companion.brain.state.activity;}}}''')
 assert page.evaluate('__changes')==0
 assert page.evaluate('[__lr.companion.brain.state.x,__lr.companion.brain.state.z]')==page.evaluate('__spot')
 print('PASS: all four desk rotations, adjacent free approach, screen facing, typing pose, hour-long commitment and five-minute stability',flush=True)
 # Capture the actual in-room typing pose.
 page.evaluate('__lr.view.frame(.01,__lr.view.t+.01)');page.screenshot(path='/tmp/bot-typing-room.png')
 for rotation in range(4):
  page.evaluate('r=>{window.__hour=14;setupBot("read",r);advanceBot(100)}',rotation)
  assert page.evaluate('__lr.companion.brain.state.pose')=='read'
  assert page.evaluate('__lr.companion.brain.state.activity.seated')
  assert page.evaluate('__lr.companion.brain.state.y')==1
  assert page.evaluate('__lr.companion.object.userData.parts.book.visible')
  assert page.evaluate('__lr.companion.brain.state.heading===__lr.companion.brain.state.activity.seat.heading')
  assert page.evaluate('JSON.stringify(__lr.room.serialize())===__decor')
 page.evaluate('__lr.view.frame(.01,__lr.view.t+.01)');page.screenshot(path='/tmp/bot-reading-room.png')
 page.evaluate('setupBot("floor");advanceBot(70)');assert page.evaluate('__lr.companion.brain.state.pose')=='read';assert page.evaluate('__lr.companion.brain.state.y')==0
 page.evaluate('window.__hour=0;setupBot("bed");advanceBot(90)')
 assert page.evaluate('__lr.companion.brain.state.pose')=='sleep'
 assert page.evaluate('__lr.companion.brain.state.brightness')==.18
 assert page.evaluate('__lr.companion.object.children.some(o=>o.rotation.x===-Math.PI/2)')
 page.evaluate('setupBot("empty");advanceBot(90)');assert page.evaluate('__lr.companion.brain.state.pose')=='powerdown'
 assert page.evaluate('__lr.companion.brain.state.x===.5 && __lr.companion.brain.state.z===.5')
 print('PASS: all four reading-seat rotations, visible book, floor reading, bed lie-down, dim sleep and corner power-down',flush=True)
 page.evaluate('window.__hour=14;setupBot("music");advanceBot(60);__lr.view.beat=0;__lr.companion.frame(.1)')
 assert page.evaluate('__lr.companion.brain.state.mode')=='bop'
 assert page.evaluate('__lr.companion.brain.state.bob')==.065
 page.evaluate('''() => {__lr.room.items[0].on=false;__lr.changed();advanceBot(3)}''');assert page.evaluate('__lr.companion.brain.state.activity') is None
 page.evaluate('window.__hour=8;setupBot("tea");advanceBot(60)');assert page.evaluate('__lr.companion.brain.state.mode')=='tea'
 page.emulate_media(reduced_motion='reduce')
 page.evaluate('window.__hour=18;setupBot("desk");advanceBot(60)')
 angles=page.evaluate('[__lr.companion.object.userData.parts.leftarm.rotation.x,__lr.companion.brain.state.blink,__lr.companion.brain.state.weight]')
 page.evaluate('advanceBot(2)');assert page.evaluate('[__lr.companion.object.userData.parts.leftarm.rotation.x,__lr.companion.brain.state.blink,__lr.companion.brain.state.weight]')==angles
 page.evaluate('''() => {__lr.room.items=[];__lr.changed();advanceBot(10)}''');assert page.evaluate('__lr.companion.brain.state.activity') is None
 page.evaluate('window.__hour=14;setupBot("empty");advanceBot(60)');assert page.evaluate('__lr.companion.brain.state.mode') in ['idle','wander']
 for width in [320,390]:
  page.set_viewport_size({'width':width,'height':844});page.evaluate('__lr.view.resize();__lr.companion.tap();__lr.companion.frame(.1)')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 assert not external,external
 print('PASS: playing-record beat hook, stopped music recovery, tea activity, reduced motion, furniture removal, empty-room fallback, mobile widths and no remote calls',flush=True)
 browser.close()
server.shutdown()
