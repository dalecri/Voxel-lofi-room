"""npm run build && python3 tests/beam-browser.py. Ceiling beams: placement, pendant attachment, occlusion, LR1 round trip, thumbnails."""
import functools,os
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
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':900,'height':760},reduced_motion='reduce')
 context.add_init_script("localStorage.setItem('lr.intro','true')")
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 # A furnished 14-cell room, default camera, daylight.
 page.evaluate('''() => {const a=__lr;a.meta.realtime=false;a.meta.visitors=false;a.meta.mischief=false;a.setPhase('day',true);a.view.setPhase('day',true);
  const r=a.room;r.items=[];r.n=14;r.name='Beam Room';a.changed();a.view.zoomGoal=a.view.zoom=1;a.view.frame(0.016,1);window.__empty=a.view.r.domElement.toDataURL('image/png');
  const put=(t,o)=>{if(!LR.CAT[t])throw Error('missing piece '+t);const it=r.make(t,o);if(r.canPlace(it))r.add(it);return it;};
  for(const [t,o] of [['sofa',{x:2,z:6}],['coffee',{x:3,z:9}],['rug',{x:2,z:8}],['bed',{x:9,z:1}],['desk',{x:5,z:0}],['chair',{x:5,z:1}],['bookshelf',{x:0,z:2,r:1}],['plant',{x:12,z:12}],['dresser',{x:9,z:10}],['lamp',{x:1,z:12}],['cat',{x:7,z:9}],['window',{k:1,u:5,e:1}]])put(t,o);
  a.changed();a.view.zoomGoal=a.view.zoom=1;}''')
 page.wait_for_timeout(1500)
 shot=lambda path:page.locator('#c').screenshot(path=path)
 before=page.evaluate('''() => {__lr.view.frame(0.016,1);return __lr.view.r.domElement.toDataURL('image/png')}''')
 shot('/tmp/beam-before.png')
 # Two beam runs spanning the room (three beams each), one turned beam in the corner, and a pendant hanging from a beam.
 placed=page.evaluate('''() => {const a=__lr,r=a.room;const out=[];
  for(const o of [{x:1,z:4,c:0},{x:5,z:4,c:0},{x:9,z:4,c:0},{x:1,z:10,c:1},{x:5,z:10,c:1},{x:9,z:10,c:1},{x:13,z:1,r:1,c:2}]){const it=r.make('beam',o);if(r.canPlace(it)){r.add(it);out.push(it.id);}}
  a.changed();return out.length;}''')
 assert placed==7,placed
 page.wait_for_timeout(1200)
 after=page.evaluate('''() => {__lr.view.frame(0.016,1);return __lr.view.r.domElement.toDataURL('image/png')}''')
 shot('/tmp/beam-after.png')
 pendant=page.evaluate('''() => {const a=__lr,r=a.room,p=r.make('pendantlamp',{x:6,z:4}),ok=r.canPlace(p);if(ok)r.add(p);a.changed();return ok;}''')
 assert pendant;page.wait_for_timeout(1000);shot('/tmp/beam-pendant.png')
 # Occlusion: of the pixels where furniture shows (empty room vs furnished), how many do the beams cover?
 cover=page.evaluate('''async ([b,a]) => {const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});const [E,B,A]=await Promise.all([load(window.__empty),load(b),load(a)]);
  const w=B.width,h=B.height,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
  const px=I=>{g.clearRect(0,0,w,h);g.drawImage(I,0,0);return g.getImageData(0,0,w,h).data;};const pe=px(E),pb=px(B),pa=px(A);
  const d=(p,q,i)=>Math.abs(p[i]-q[i])+Math.abs(p[i+1]-q[i+1])+Math.abs(p[i+2]-q[i+2])+Math.abs(p[i+3]-q[i+3])>60;
  let furniture=0,covered=0,changed=0,visible=0;for(let i=0;i<pb.length;i+=4){if(pb[i+3]>0)visible++;if(d(pb,pa,i))changed++;if(d(pe,pb,i)){furniture++;if(d(pb,pa,i))covered++;}}
  return {furniture:covered/furniture,overall:changed/visible};}''',[before,after])
 print(f"beams cover {cover['furniture']*100:.1f}% of furniture pixels, {cover['overall']*100:.1f}% of the whole view")
 assert cover['furniture']<0.08,cover
 # Real LR1 share-code round trip.
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',code)
 beams=sorted((i['x'],i['z'],i.get('r',0),i.get('c',0)) for i in decoded['items'] if i['t']=='beam')
 assert beams==[(1,4,0,0),(1,10,0,1),(5,4,0,0),(5,10,0,1),(9,4,0,0),(9,10,0,1),(13,1,1,2)],beams;assert any(i['t']=='pendantlamp' for i in decoded['items'])
 # Village thumbnails render the room with its beams.
 diff=page.evaluate('''() => {const d=__lr.room.serialize(),plain=JSON.parse(JSON.stringify(d));plain.items=plain.items.filter(i=>i.t!=='beam');return __lr.view.roomThumb(d)!==__lr.view.roomThumb(plain);}''')
 assert diff
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(600);shot('/tmp/beam-mobile.png')
 assert not errors,errors
 print('PASS: beams place both ways over furniture, a pendant hangs from one, beams change only a thin strip of the view, travel in LR1 codes and appear in thumbnails, no console errors',flush=True)
 browser.close()
server.shutdown()
