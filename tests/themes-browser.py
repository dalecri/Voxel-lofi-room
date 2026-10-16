"""npm run build && python3 tests/themes-browser.py BATCH (1-4). Three real placements per pack at 390px."""
import functools,json,sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];batch=int(sys.argv[1]) if len(sys.argv)>1 else 1;groups=json.loads((ROOT/'tests/theme-packs.json').read_text())[(batch-1)*5:batch*5];assert len(groups)==5
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);c=b.new_context(viewport={'width':390,'height':844});c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());c.add_init_script("localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({realtime:false,phase:'day',music:false,sound:false,visitors:false,mischief:false,liveExtras:false,calmPerformance:true}))")
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()')
 for group in groups:
  result=page.evaluate('''g=>{const a=__lr;a.room.items=[];a.room.n=10;a.room.name=g;a.setMode('explore',true);const entries=Object.entries(LR.CAT).filter(([id,C])=>C.group===g);if(entries.length!==8)throw Error('Wrong piece count '+g);const selected=entries.slice(0,3),placed=[];
   for(let n=0;n<selected.length;n++){const [t,C]=selected[n],o=C.kind==='wall'?{k:0,u:n*3,e:0}:{x:1+n*3,z:3};const it=a.room.make(t,{...o,c:n%3,on:C.on??false});if(!a.room.canPlace(it))throw Error('Cannot place '+t);a.room.add(it);placed.push(it.id);}a.changed();
   for(const id of placed){const it=a.room.get(id),C=LR.CAT[it.t],obj=a.view.objs.get(id);a.interact(id);a.view.frame(.2,2);if(C.tap==='spin'&&!(obj.userData.spinV>0))throw Error('No spin on tap '+it.t);if(C.musicMood===1&&a.meta.mood!==1)throw Error('No jazz');if(C.tap==='toggle'&&!['fire'].includes(C.anim)&&a.room.get(id).on===true)throw Error('Toggle failed '+it.t);}
   a.view.setPhase('day',true);a.view.frame(.2,3);a.view.draw();return placed.map(id=>a.room.get(id).t);}''',group)
  assert len(result)==3;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/theme-{group}-390.png');print('PASS placed/tapped '+group+': '+', '.join(result),flush=True)
 # Thumbnail contact sheet is generated from every piece in this batch, not just the spot-checks.
 art=page.evaluate('''gs=>Object.entries(LR.CAT).filter(([id,C])=>gs.includes(C.group)).map(([id,C])=>({name:C.name,url:__lr.view.thumb({t:id,c:0,on:true})}))''',groups)
 gallery=c.new_page();gallery.set_viewport_size({'width':900,'height':1000});gallery.set_content('<body style="background:#ded2c3;font:13px sans-serif"><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px">'+''.join('<div style="background:#fbf1df;text-align:center;padding:4px;border-radius:10px"><img width="100" height="100" src="'+r['url']+'"><br>'+r['name']+'</div>' for r in art)+'</div></body>');gallery.screenshot(path=f'/tmp/themes-batch-{batch}.png',full_page=True);gallery.close();assert not errors,errors
 print('PASS batch '+str(batch)+': all thumbnails, mobile rendering/taps and no console errors',flush=True);b.close()
server.shutdown()
