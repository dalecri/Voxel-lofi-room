"""npm run build && python3 tests/missing-furniture-browser.py"""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844})
 context.add_init_script("localStorage.setItem('lr.intro','true')")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 page.evaluate('''() => {const a=__lr,r=a.room;r.items=[];r.n=10;r.wall={style:'paint',color:0};r.floor={style:'oak'};a.setMode('explore',true);a.meta.visitors=false;a.meta.realtime=false;a.setPhase('day',true);
 const counter=r.add(r.make('counter',{x:1,z:6}));window.__pieces={};
 for(const [t,props] of [['microwave',{p:counter.id,lx:1,lz:0}],['coffee',{x:5,z:5}],['pendantlamp',{x:5,z:5}],['slidingdoor',{k:1,u:4,e:0}]]){const it=r.make(t,props);if(!r.canPlace(it))throw Error('Invalid placement: '+t);r.add(it);__pieces[t]=it.id;}
 r.add(r.make('sofa',{x:1,z:1}));r.add(r.make('plant',{x:8,z:6}));a.changed();a.view.setPhase('day',true);a.view.frame(.1,a.view.t+.1);
 window.__beeps=0;const beep=a.Sound.blip;a.Sound.blip=function(...args){__beeps++;return beep.apply(this,args)};
 }''')
 def tap(piece,point):
  pos=page.evaluate('''({id,point})=>{const a=__lr,p=a.view.root.localToWorld(a.view.itemPoint(__pieces[id],point)).project(a.view.cam),r=a.view.r.domElement.getBoundingClientRect(),x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;for(let dy=-12;dy<=12;dy+=3)for(let dx=-12;dx<=12;dx+=3)if(a.view.pickItem(x+dx,y+dy)?.id===__pieces[id])return {x:x+dx,y:y+dy};throw Error('No visible tap: '+id)}''',{'id':piece,'point':point})
  page.mouse.click(pos['x'],pos['y'])
 tap('microwave',[4,4,8]);page.wait_for_function('__lr.room.get(__pieces.microwave).on && __lr.view.objs.get(__pieces.microwave).userData.doorA>.9');page.wait_for_function('__beeps===1')
 tap('microwave',[7,4,8]);page.wait_for_function('!__lr.room.get(__pieces.microwave).on && __lr.view.objs.get(__pieces.microwave).userData.doorA<.1')
 tap('slidingdoor',[18,12,4]);page.wait_for_function('__lr.room.get(__pieces.slidingdoor).on && __lr.view.objs.get(__pieces.slidingdoor).userData.doorA>.9')
 tap('slidingdoor',[6,12,4]);page.wait_for_function('!__lr.room.get(__pieces.slidingdoor).on && __lr.view.objs.get(__pieces.slidingdoor).userData.doorA<.1')
 tap('pendantlamp',[4,33,6]);assert not page.evaluate('__lr.room.get(__pieces.pendantlamp).on')
 tap('pendantlamp',[4,33,6]);assert page.evaluate('__lr.room.get(__pieces.pendantlamp).on')
 # Check the real mute gate on the appliance beep rather than just spying its method.
 assert page.evaluate('''() => {const S=__lr.Sound,old=S.tone;let tones=0;S.tone=()=>tones++;S.on=false;S.blip();S.tone=old;S.on=true;return tones===0;}''')
 page.add_style_tag(content='#toasts,#lampbotBubble{visibility:hidden!important}')
 for width in [390,1280]:
  page.set_viewport_size({'width':width,'height':844})
  for c in range(3):
   page.evaluate('c=>{for(const id of [__pieces.microwave,__pieces.pendantlamp,__pieces.slidingdoor])__lr.room.get(id).c=c;__lr.changed();__lr.view.setPhase("day",true)}',c)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.screenshot(path=f'/tmp/missing-furniture-{width}-palette-{c}.png')
 assert not errors,errors
 print('PASS: every palette at 390px/desktop; real room taps open and close microwave/glass door and toggle pendant; mute respected; no console errors')
 browser.close()
server.shutdown()
