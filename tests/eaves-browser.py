"""npm run build && python3 tests/eaves-browser.py — shell trim, actual placement and thumbnails."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.add_init_script("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({sound:false,music:false,realtime:false,phase:'day',visitors:false,calmPerformance:true}))")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());context.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.view')
 page.evaluate('''() => {const a=__lr,r=a.room;r.items=[];r.n=10;r.wall={style:'paint',color:0};r.floor={style:'oak'};r.name='Little house';a.meta.visitors=false;a.meta.realtime=false;a.meta.dreamy=false;a.setPhase('day',true);r.add(r.make('coffee',{x:4,z:4}));r.add(r.make('sofa',{x:1,z:1}));r.add(r.make('plant',{x:8,z:2}));r.add(r.make('window',{k:0,u:6,e:2}));a.state.tool='add';a.state.add='eaves';a.state.group='decor';a.setMode('edit',true);a.changed();a.renderLoop.stop();a.view.frame(.1,a.view.t+.1);}''')
 def drop(x,z):
  point=page.evaluate('''({x,z})=>{const v=__lr.view,p=v.root.localToWorld(new THREE.Vector3(x,0,z)).project(v.cam),r=v.r.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}}''',{'x':x,'z':z});page.mouse.click(point['x'],point['y'])
 drop(4.5,4.5);assert page.evaluate('__lr.room.items.filter(i=>i.t==="eaves").length')==1;first=page.evaluate('__lr.room.items.find(i=>i.t==="eaves").id');drop(7.5,5.5);assert page.evaluate('__lr.room.items.filter(i=>i.t==="eaves").length')==1;assert page.evaluate('__lr.room.items.find(i=>i.t==="eaves").id')!=first
 page.keyboard.press('Control+z');assert page.evaluate('__lr.room.items.find(i=>i.t==="eaves").id')==first
 page.evaluate('__lr.setMode("explore",true);__lr.renderLoop.stop()');page.add_style_tag(content='#toasts,#lampbotBubble{visibility:hidden!important}')
 # Cutaway follows the live camera, not a hardcoded pair of back walls.
 for yaw in [.8,2.4,3.9,5.6]:
  page.evaluate('yaw=>{const v=__lr.view;v.yaw=v.yawGoal=yaw;v.frame(.1,v.t+.1)}',yaw)
  assert page.evaluate('''() => {const v=__lr.view,o=v.objs.get(__lr.room.items.find(i=>i.t==='eaves').id);return Object.entries(o.userData.parts).every(([k,p])=>p.visible===!!(v.mask&(1<<Number(k[5]))));}''')
 # Live resize/cache + every palette, and the 32-cell packed-coordinate edge case.
 page.evaluate('() => {const v=__lr.view;v.yaw=v.yawGoal=.8;v.frame(.1,v.t+.1)}')
 for width in [390,1280]:
  page.set_viewport_size({'width':width,'height':844});page.evaluate('async()=>{await new Promise(requestAnimationFrame);__lr.view.resize();await new Promise(requestAnimationFrame);__lr.view.draw();}')
  for n in [10,14,20,24,32]:
   for c in (range(4) if n==10 else [0]):
    page.evaluate('''({n,c})=>{const a=__lr;a.room.n=n;a.room.items.find(i=>i.t==='eaves').c=c;a.changed();a.view.frame(.1,a.view.t+.1);a.view.draw();}''',{'n':n,'c':c})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.evaluate('''() => {const a=__lr,o=a.view.objs.get(a.room.items.find(i=>i.t==='eaves').id),b=new THREE.Box3().setFromObject(o.userData.inner);return Math.abs(b.max.x-b.min.x-(a.room.n+2))<.001;}''')
    page.screenshot(path=f'/tmp/eaves-{width}-{n}-palette-{c}.png')
 # The real LR1 path retains size/color/type, and the normal village thumbnail includes trim.
 result=page.evaluate('''async()=>{const a=__lr,d=await a.readCode(await a.roomCode()),r=new LR.Room();r.load(d);if(r.items.filter(i=>i.t==='eaves').length!==1||r.n!==32)throw Error('share round trip');const saved=a.room.serialize(),before=JSON.stringify(a.room.serialize()),withTrim=a.view.roomThumb({id:700,...saved}),without=a.view.roomThumb({id:701,...saved,items:saved.items.filter(i=>i.t!=='eaves')});if(before!==JSON.stringify(a.room.serialize()))throw Error('thumbnail mutated live room');return {withTrim,without};}''');assert result['withTrim']!=result['without'];Path('/tmp/eaves-village-thumb.png').write_bytes(__import__('base64').b64decode(result['withTrim'].split(',')[1]))
 # The roof itself can be selected and removed, then restored by normal Undo.
 page.set_viewport_size({'width':390,'height':844});page.evaluate("() => {const a=__lr;a.room.n=10;a.changed();a.state.tool='remove';a.setMode('edit',true);a.view.resize();a.view.yaw=a.view.yawGoal=.8;a.view.frame(.1,a.view.t+.1);a.view.draw();}")
 pos=page.evaluate("""() => {const a=__lr,v=a.view,id=a.room.items.find(i=>i.t==='eaves').id,p=v.root.localToWorld(v.itemPoint(id,[40,58,-4])).project(v.cam),r=v.r.domElement.getBoundingClientRect(),x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;for(let dy=-10;dy<=10;dy+=2)for(let dx=-10;dx<=10;dx+=2)if(v.pickItem(x+dx,y+dy)?.id===id)return {x:x+dx,y:y+dy};throw Error('roof cannot be picked')}""")
 page.mouse.click(pos['x'],pos['y']);assert page.evaluate("__lr.room.items.every(i=>i.t!=='eaves')");page.keyboard.press('Control+z');assert page.evaluate("__lr.room.items.filter(i=>i.t==='eaves').length===1")
 page.evaluate("__lr.setMode('explore',true);__lr.setPhase('night',true);__lr.view.setPhase('night',true);__lr.view.frame(.1,__lr.view.t+.1);__lr.view.draw()");page.screenshot(path='/tmp/eaves-night-390.png')
 # Open plots have neither walls nor floating roof trim.
 page.evaluate("__lr.room.wall.style='none';__lr.changed();__lr.view.frame(.1,__lr.view.t+.1)");assert page.evaluate("!__lr.view.objs.get(__lr.room.items.find(i=>i.t==='eaves').id).visible")
 assert not errors,errors
 print('PASS real eaves placement/replacement/undo, selection/removal, rotating cutaways, 10/14/20/24/32 size and palette geometry, LR1 round trip, village thumbnails, open plots, mobile/desktop, no console errors',flush=True);browser.close()
server.shutdown()
