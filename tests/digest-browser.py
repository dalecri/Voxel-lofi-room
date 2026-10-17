"""npm run build && python3 tests/digest-browser.py. A private weekly doorstep paper, not the CBC widget."""
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
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 c.add_init_script("""const RealDate=Date;window.__clock=new RealDate(2026,9,19,9).getTime();window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[__clock]))}static now(){return __clock}};if(!localStorage.getItem('digestFixture')){const decor={v:1,name:'Drift room',n:10,wall:{style:'paint',color:0},floor:{style:'oak',color:0},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:decor.name,n:0}],'lr.room.101':decor,'lr.meta':{current:101,sound:false,music:false,realtime:false,phase:'day',visitors:false,mischief:false,calmPerformance:true},'lr.activityLog':[{date:'2026-10-14',events:['focus','tea','letter','pushups']}],'lr.tools':{ideas:[{id:'idea-1',text:'PRIVATE_IDEA',createdAt:new RealDate(2026,9,15).getTime()}]},'lr.guestbook':[{room:101,d:'2026-10-16',n:'PRIVATE_FRIEND',t:'Keep that window.'}],'lr.scenes':{files:[{id:'scene-1',title:'PRIVATE_SCENE',createdAt:new RealDate(2026,9,15).getTime(),decor},{id:'old-scene',title:'A year-old corner',createdAt:new RealDate(2025,9,19).getTime(),decor}]}}))localStorage.setItem(k,JSON.stringify(v));localStorage.setItem('digestFixture','true');}""")
 external=[];c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (external.append(r.request.url),r.abort())[-1]);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 def ready():page.wait_for_function('!!window.__lr?.digest');page.evaluate('__lr.renderLoop.stop()')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();assert page.evaluate('__lr.driftPaper.object.visible');assert page.evaluate('__lr.room.items.length')==0
 point=page.evaluate("""()=>{const a=__lr,o=a.driftPaper.object;o.updateWorldMatrix(true,true);const p=o.localToWorld(new THREE.Vector3(0,.25,0)).project(a.view.cam),r=a.view.r.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}""");assert page.evaluate('p=>__lr.driftPaper.hit(p.x,p.y)',point);page.mouse.click(point['x'],point['y']);page.locator('.drift-paper').wait_for();assert page.locator('.drift-masthead').inner_text()=='Daily Drift';assert '1 focus pause' in page.locator('.drift-paper').inner_text();assert 'PRIVATE_FRIEND' in page.locator('.drift-paper').inner_text();assert 'PRIVATE_SCENE' in page.locator('.drift-paper').inner_text();assert 'A year-old corner' in page.locator('.drift-paper').inner_text();assert not page.evaluate('__lr.driftPaper.object.visible');assert page.evaluate('__lr.digest.latest.read')
 for phase in ['day','night']:
  page.evaluate('p=>__lr.setPhase(p,true)',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/daily-drift-{phase}-{width}.png')
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert all(s not in raw for s in ['PRIVATE_','digest','daily-drift','sections']);assert page.evaluate('__lr.room.items.length')==0
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.digest.issues.length')==1;assert not page.evaluate('__lr.driftPaper.object.visible')
 # A new delivery week generates exactly once; all old issues remain readable.
 page.evaluate('__clock=new Date(2026,9,26,9).getTime();__lr.driftPaper.update()');assert page.evaluate('__lr.digest.issues.length')==2;assert page.evaluate('__lr.driftPaper.object.visible');page.evaluate('__lr.driftPaper.update();__lr.driftPaper.update()');assert page.evaluate('__lr.digest.issues.length')==2
 page.click('#bHome');page.locator('#homeView [data-app=digest]').click();assert page.locator('.drift-archive button').count()==2;page.locator('.drift-archive button').last.click();assert 'PRIVATE_FRIEND' in page.locator('.drift-paper').inner_text();assert page.locator('.drift-edition').inner_text().startswith('2026-W43');page.keyboard.press('Escape')
 # The non-decor paper never blocks placement or becomes a catalog item.
 page.evaluate("__lr.setMode('edit',true);__lr.driftPaper.update()");assert not page.evaluate('__lr.driftPaper.object.visible');assert page.evaluate("LR.CAT['daily-drift-paper']===undefined");assert page.evaluate('__lr.room.items.length')==0
 assert not external,external;assert not errors,errors;print('PASS actual doormat tap, fixed weekly reflection and memories, read/pickup and reload, ISO rollover/past issues, private room codes, no decor mutation or network, day/night mobile/desktop',flush=True);b.close()
server.shutdown()
