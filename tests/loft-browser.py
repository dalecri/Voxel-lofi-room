"""npm run build && python3 tests/loft-browser.py. Real placement, voxel geometry and lamp persistence."""
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
 context=browser.new_context(viewport={'width':1280,'height':900})
 context.add_init_script("localStorage.setItem('lr.intro','true')")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
 page.add_style_tag(content='#lampbotBubble,#toasts{display:none!important}')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=14;a.meta.visitors=false;a.meta.realtime=false;a.meta.dreamy=false;a.checkDrift(true);a.setMode('explore',true);
  const C=LR.CAT.loft;if(C.kind!=='floor'||C.group!==LR.CAT.bed.group||C.size.join()!=='3,2'||C.vars.length!==3||C.tap!=='toggle'||C.top||C.seat||C.nap)throw Error('Loft contract');
  for(let c=0;c<3;c++){const it=a.room.make('loft',{x:1+c*4,z:5,c});if(!a.room.canPlace(it))throw Error('Loft cannot place');a.room.add(it);}a.changed();
  window.checkFaces=id=>{const seen=new Set();for(const mesh of a.view.objs.get(id).userData.meshes){const pos=mesh.geometry.getAttribute('position');if(pos.count%4)throw Error('Unexpected voxel faces');for(let i=0;i<pos.count;i+=4){const vertices=[];for(let j=0;j<4;j++)vertices.push([pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j)].map(n=>n.toFixed(6)).join(','));const key=vertices.sort().join('|');if(seen.has(key))throw Error('Coplanar duplicate face');seen.add(key);}}return seen.size;};
 }''')
 for c in range(3):
  result=page.evaluate('''c=>{const a=__lr,it=a.room.items.find(i=>i.t==='loft'&&i.c===c),C=LR.CAT.loft,m=new LR.Model();C.build(m,C.vars[c],{on:true});const xyz=[...m.parts.main.vox.keys()].map(LR.Model.decode),on=[...m.parts.main.vox.values()].filter(v=>v&(1<<24)).length;if(xyz.some(([x,y,z])=>x<0||x>=24||z<0||z>=16))throw Error('Outside footprint');if(Object.keys(m.parts).length!==1||on!==10)throw Error('Bulbs or parts');const faces=checkFaces(it.id);a.interact(it.id);if(it.on||a.view.pool.some(l=>l.userData.it?.id===it.id))throw Error('Toggle off failed');checkFaces(it.id);a.interact(it.id);if(!it.on||!a.view.pool.some(l=>l.userData.it?.id===it.id))throw Error('Toggle on failed');return {faces,on};}''',c)
  assert result['faces']>100 and result['on']==10
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':900});page.screenshot(path=f'/tmp/loft-all-{phase}-{width}.png')
 print('PASS: three variants place together in explore, one footprint and mesh, ten switchable glow voxels, real lamp allocation, no duplicate platform faces',flush=True)
 # Close views show bedding, the short-side ladder and the decorative desk.
 for c in range(3):
  page.evaluate('''c=>{const a=__lr;a.room.items=[];a.room.n=10;a.room.name=['Oak loft','Walnut loft','Birch loft'][c];a.room.add(a.room.make('loft',{x:4,z:4,c}));a.changed();a.view.zoomGoal=2;}''',c)
  for phase in ['day','night']:
   page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
   for width in [390,1280]:
    page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(300);page.screenshot(path=f'/tmp/loft-{c}-{phase}-{width}.png');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 # Persist an off lamp and the final colour through the normal room save and reload.
 page.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='loft').id)");page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()");page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr')
 assert page.evaluate("__lr.room.items.filter(i=>i.t==='loft').map(i=>[i.c,i.on])")==[[2,False]]
 assert page.evaluate("__lr.view.objs.get(__lr.room.items.find(i=>i.t==='loft').id).userData.meshes.length")==1
 page.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='loft').id)");assert page.evaluate("__lr.room.items.find(i=>i.t==='loft').on")
 assert not errors,errors
 print('PASS: all variants in day/night at 390/1280 widths, screenshots captured, colour and light state survive reload, no console errors',flush=True)
 browser.close()
server.shutdown()
