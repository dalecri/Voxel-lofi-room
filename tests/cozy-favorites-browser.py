"""npm run build && python3 tests/cozy-favorites-browser.py. Shared favorites and removed-seat recovery."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path(__file__).resolve().parents[1]/'www')));Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);c=b.new_context();c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());c.add_init_script("localStorage.setItem('lr.intro','true')");page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.goto(f'http://127.0.0.1:{s.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 result=page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.meta.current=900;a.meta.visitors=false;a.setMode('explore',true);const seat=a.room.make('sofa',{x:4,z:4});a.room.add(seat);for(const x of [2,8])a.room.add(a.room.make('cat',{x,z:4}));a.changed();const pets=[...a.view.pets.values()],old=Math.random;Math.random=()=>.1;try{for(const P of pets)a.view.decidePet(P,Math.floor(P.x),Math.floor(P.z));}finally{Math.random=old}if(pets.some(p=>!p.next))throw Error('No favorite route');if(pets[0].next.x===pets[1].next.x&&pets[0].next.z===pets[1].next.z)throw Error('Shared reserved spot');for(let i=0;i<100;i++)a.view.updatePets(.1,a.view.t+i*.1);if(pets.some(p=>p.state!=='nap'||p.timer<100))throw Error('No long favorite nap');a.room.remove(seat.id);a.changed();for(let i=0;i<20;i++)a.view.updatePets(.1,a.view.t+10+i*.1);if(pets.some(p=>p.perch||p.y>0))throw Error('Removed favorite still occupied');return true;}''');assert result;assert not errors,errors;print('PASS: separate favorite reservations, long naps, removed-seat recovery without floating or errors');b.close()
s.shutdown()
