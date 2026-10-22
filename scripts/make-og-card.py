"""npm run build && python3 scripts/make-og-card.py
Paints the 1200x630 link-preview picture (assets/og-card.jpg) from the app's own default room,
so chat apps show a cozy card instead of a bare link. Re-run it when the look changes."""
import base64,functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
PAINT='''async()=>{
 __lr.setPhase('evening',true);await new Promise(r=>setTimeout(r,900));
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});
 const [room,icon]=await Promise.all([load(__lr.view.snapshot()),load('assets/icon.png')]);await document.fonts.ready;
 const W=1200,H=630,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#2a2550');bg.addColorStop(.6,'#433a74');bg.addColorStop(1,'#6b5592');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.fillStyle='#ffffffa0';for(let i=0;i<60;i++){const x=(i*197)%W,y=(i*331)%H,r=i%5===0?2.6:1.4;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
 const crop=LRShareLinks.bounds(room),box={x:40,y:40,w:640,h:550},s=Math.min(box.w/crop.w,box.h/crop.h),w=crop.w*s,h=crop.h*s;
 g.drawImage(room,crop.x,crop.y,crop.w,crop.h,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);
 const x=700;g.save();g.beginPath();g.roundRect(x,150,96,96,24);g.clip();g.drawImage(icon,x,150,96,96);g.restore();
 g.fillStyle='#fff6ea';g.font='600 76px Fredoka, Nunito, sans-serif';g.fillText('Lofi Rooms',x,340);
 g.fillStyle='#d9cff5';g.font='800 32px Nunito, sans-serif';g.fillText('Step inside a cozy voxel room',x,400);
 g.font='600 26px Nunito, sans-serif';g.fillText('Tap the link to visit',x,446);
 g.fillStyle='#d9cff5b0';g.font='700 22px Nunito, sans-serif';g.fillText('heycristobal.com',x,540);
 return c.toDataURL('image/jpeg',.88);}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 ctx=browser.new_context(reduced_motion='reduce',viewport={'width':1200,'height':900},device_scale_factor=1)
 ctx.add_init_script("localStorage.setItem('lr.intro','true')")
 page=ctx.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 data=page.evaluate(PAINT);out=ROOT/'assets'/'og-card.jpg';out.write_bytes(base64.b64decode(data.split(',')[1]))
 print('wrote',out,out.stat().st_size,'bytes');browser.close()
