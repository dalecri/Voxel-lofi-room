"""npm run build && python3 tests/pixel-maker-browser.py. Private pixel maker tools, printer, and wall prints."""
import functools,json
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
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script('''if(!sessionStorage.houseFixture){sessionStorage.houseFixture='true';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.draft':{id:102,base:'',data:{...b,name:'Living draft restored'}},'lr.mainBedroom':101,'lr.meta':{current:102,visitors:false,realtime:false,dreamy:false,phase:'day',stations:[{name:'Old station',url:'https://example.com/old.mp3'}]}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 page.evaluate("const a=__lr;a.room.items=[];a.room.n=10;const book=a.room.add(a.room.make('sketchbook',{x:2,z:2}));a.changed();a.interact(book.id)")
 body=page.locator('#sheetBody');canvas=page.locator('.pixel-grid');assert body.locator('h2').inner_text()=='Pixel maker';assert page.locator('.pixel-color').count()==12;assert page.locator('.pixel-color').evaluate_all('bs=>bs.every(b=>!b.textContent && b.getAttribute("aria-label"))');assert canvas.get_attribute('aria-rowcount')=='16'
 def cell(x,y,drag=None):
  canvas.scroll_into_view_if_needed();box=canvas.bounding_box();n=page.evaluate('__lr.roomTools.pixels.grid.size');page.mouse.move(box['x']+(x+.5)/n*box['width'],box['y']+(y+.5)/n*box['height']);page.mouse.down()
  if drag:
   a,b=drag;page.mouse.move(box['x']+(a+.5)/n*box['width'],box['y']+(b+.5)/n*box['height'],steps=6)
  page.mouse.up()
 def color(name):page.get_by_role('button',name=name,exact=True).click()
 cell(2,2);assert page.evaluate('__lr.roomTools.pixels.grid.cells[34]')==1
 color('Blue');page.get_by_role('button',name='2 × 2',exact=True).click();cell(5,5);assert page.evaluate('__lr.roomTools.pixels.grid.cells.filter(c=>c===3).length')==4
 page.locator('#sheetBody').get_by_role('button',name='Undo',exact=True).click();assert page.evaluate('__lr.roomTools.pixels.grid.cells.filter(c=>c===3).length')==0;page.get_by_role('button',name='Redo',exact=True).click();assert page.evaluate('__lr.roomTools.pixels.grid.cells.filter(c=>c===3).length')==4
 page.get_by_role('button',name='1 cell',exact=True).click();page.get_by_role('button',name='Horizontal mirror',exact=True).click();color('Pink');cell(1,7);assert page.evaluate('__lr.roomTools.pixels.grid.cells[7*16+14]')==10
 page.get_by_role('button',name='Eraser',exact=True).click();cell(1,7);assert page.evaluate('__lr.roomTools.pixels.grid.cells[7*16+14]')==-1
 page.get_by_role('button',name='Horizontal mirror',exact=True).click();page.get_by_role('button',name='Fill bucket',exact=True).click();color('Peach');cell(0,0);assert page.evaluate('__lr.roomTools.pixels.grid.cells.filter(c=>c===9).length')==251;page.locator('#sheetBody').get_by_role('button',name='Undo',exact=True).click();assert page.evaluate('__lr.roomTools.pixels.grid.cells.filter(c=>c===9).length')==0
 page.get_by_role('button',name='Brush',exact=True).click();color('Green');cell(1,10,(7,10));assert page.evaluate('__lr.roomTools.pixels.grid.cells.filter(c=>c===6).length')==7;page.locator('#sheetBody').get_by_role('button',name='Undo',exact=True).click();assert page.evaluate('__lr.roomTools.pixels.grid.cells.filter(c=>c===6).length')==0
 page.get_by_role('button',name='32 × 32',exact=True).click();assert canvas.get_attribute('aria-rowcount')=='32';page.locator('#sheetBody').get_by_role('button',name='Undo',exact=True).click();assert canvas.get_attribute('aria-rowcount')=='16'
 canvas.focus();page.keyboard.press('ArrowRight');page.keyboard.press('Enter');assert page.evaluate('__lr.roomTools.pixels.grid.cells[1]')==6
 grid=page.evaluate('__lr.roomTools.pixels.grid');page.keyboard.press('Escape');page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.roomTools.pixels.grid')==grid;page.evaluate("__lr.roomToolsUI.open('sketch')")
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});body.evaluate('e=>e.scrollTop=0');assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/pixel-maker-{phase}-{width}.png')
 page.set_viewport_size({'width':390,'height':844});page.get_by_role('button',name='Print pixel art',exact=True).click();assert page.locator('.pixel-receipt').is_visible();assert page.locator('.pixel-receipt').evaluate('e=>e.classList.contains("printing")');page.get_by_role('button',name='Hang on wall',exact=True).wait_for(state='visible');assert page.locator('.pixel-receipt img').evaluate('e=>e.naturalWidth')==160
 with page.expect_download() as info:page.get_by_role('button',name='Download PNG',exact=True).click()
 download=info.value;assert download.suggested_filename.startswith('pixel-art-');download.save_as('/tmp/pixel-maker-export.png')
 page.get_by_role('button',name='Hang on wall',exact=True).click();assert not page.locator('#sheet').evaluate('e=>e.classList.contains("open")');assert page.evaluate('__lr.room.items.some(i=>i.t==="pixelposter")')
 page.evaluate('__lr.cozy.frame(.3,__lr.view.t+2)');assert page.evaluate("() => {const a=__lr,it=a.room.items.find(i=>i.t==='pixelposter'),s=a.cozy.surfaces.get(it.id);return a.roomTools.pixelPoster(a.meta.current,it.id).cells.some(c=>c>=0)&&s.mesh.visible&&s.mesh.material.map.magFilter===THREE.NearestFilter&&s.canvas.getContext('2d').getImageData(0,0,s.canvas.width,s.canvas.height).data.some((v,i)=>i%4===3&&v>0);}")
 page.reload(wait_until='networkidle');ready();page.evaluate('__lr.cozy.frame(.3,__lr.view.t+2)');assert page.evaluate("() => {const it=__lr.room.items.find(i=>i.t==='pixelposter');return !!it&&__lr.roomTools.pixelPoster(__lr.meta.current,it.id).cells.some(c=>c>=0)&&__lr.cozy.surfaces.has(it.id)}")
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'pixelposter' in raw;assert 'cells' not in raw;assert 'pixelPosters' not in raw
 page.evaluate("__lr.roomToolsUI.open('sketch')");page.get_by_role('button',name='Clear page',exact=True).click();assert page.evaluate('__lr.roomTools.pixels.grid.cells.every(c=>c<0)');page.locator('#sheetBody').get_by_role('button',name='Undo',exact=True).click();assert page.evaluate('__lr.roomTools.pixels.grid')==grid
 assert not errors,errors;print('PASS pixel drawing tools, gesture undo/redo, resize/keyboard, reload, printed PNG, wall art, privacy and responsive themes',flush=True);browser.close()
server.shutdown()
