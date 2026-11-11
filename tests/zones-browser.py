"""npm run build && python3 tests/zones-browser.py. Zones, the backdrop, redo, the eyedropper, hidden walls and the icon rail, at 390px and desktop."""
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
POINT='''([x,z,y])=>{const v=__lr.view,p=v.root.localToWorld(new THREE.Vector3(x,y||0,z)).project(v.cam),r=v.r.domElement.getBoundingClientRect();return [r.left+(p.x+1)/2*r.width,r.top+(1-p.y)/2*r.height];}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for width in [390,1280]:
  context=browser.new_context(viewport={'width':width,'height':844},reduced_motion='reduce')
  context.add_init_script('''if(!sessionStorage.zoneFixture){sessionStorage.zoneFixture='true';const r={v:1,name:'Zone room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[{id:1,t:'bed',c:2,r:0,x:0,z:0,on:false},{id:2,t:'partition',c:3,r:0,x:8,z:0,on:false}],next:3};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:2}],'lr.room.101':r,'lr.tipEdit':true,'lr.tipKeys':true,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
  context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr')
  at=lambda x,z,y=0:page.evaluate(POINT,[x,z,y])
  room=lambda expr:page.evaluate('JSON.stringify('+expr+')')
  # The backdrop sits behind the room, follows the room's view, and has an off switch.
  page.wait_for_function('document.querySelector("#backdrop").width>40')
  assert page.locator('#backdrop').evaluate('c=>!c.hidden && getComputedStyle(c).pointerEvents==="none" && getComputedStyle(c).imageRendering==="pixelated"')
  order=page.evaluate('[...document.body.children].map(e=>e.id)');assert order.index('backdrop')<order.index('c')
  ink=lambda:page.evaluate('(()=>{const c=document.querySelector("#backdrop"),d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let top=0,bottom=0,sum=0;for(let x=0;x<c.width;x++){top+=d[(c.width+x)*4+3];bottom+=d[((c.height-1)*c.width+x)*4+3];}for(let i=0;i<d.length;i+=97)sum+=d[i];return [top,bottom>0,sum];})()')
  city=ink();assert city[0]==0 and city[1],city
  page.click('#bEdit');page.wait_for_function('__lr.state.mode==="edit"')
  assert page.locator('#bRedo').is_hidden();assert page.locator('.tools [data-tool]').count()==6
  # Icon rail: every group is a button with a name; the tray folds down to the strip and back.
  rail=page.locator('#tabs.rail .tab[data-group]');assert rail.count()==page.evaluate('LR.GROUPS.length')
  assert rail.evaluate_all('es=>es.every(e=>e.getAttribute("aria-label") && e.title && e.textContent.trim()===e.getAttribute("aria-label"))')
  assert page.locator('#tabs .tab.icon span').first.evaluate('e=>e.getBoundingClientRect().width<=1')
  page.wait_for_function('document.querySelectorAll("#tabs .tab.icon img[src]").length>=3')
  full=page.locator('#tray').bounding_box()['height'];page.click('#trayFold')
  assert page.locator('#tray').evaluate('e=>e.classList.contains("folded")');assert page.locator('#row').is_hidden();assert page.locator('#furnitureSearch').is_hidden()
  assert page.locator('#tray').bounding_box()['height']<full*0.5;assert page.evaluate('localStorage.getItem("lr.trayFold")')=='true'
  page.locator('#tabs .tab[data-group="doors"]').click();assert not page.locator('#tray').evaluate('e=>e.classList.contains("folded")')
  assert page.locator('#row .swatch[data-furniture="partition"]').count()==1;assert page.evaluate('localStorage.getItem("lr.trayFold")')=='false'
  if width==390:
   box=page.locator('.tools').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390
   assert page.locator('.tools button').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'),'tool labels fit'
  # Zones: a floor patch by dragging, one wall by tapping, Reset to go back.
  page.click('.tools [data-tool="paint"]');page.get_by_role('button',name='Floor',exact=True).click()
  assert page.locator('#bZoneReset').count()==0;page.click('#bZones');assert page.locator('#bZones').get_attribute('aria-pressed')=='true'
  a,b=at(5.5,0.5),at(9.5,5.5)
  page.mouse.move(*a);page.mouse.down();page.mouse.move(*b,steps=5);page.mouse.up()
  assert room('__lr.room.zones')=='[]','no brush yet: nothing painted'
  page.locator('#row .swatch',has_text='Checker').first.click();assert room('__lr.room.floor.style')=='"oak"','a swatch only loads the brush'
  page.mouse.move(*a);page.mouse.down();page.mouse.move(*b,steps=5);assert page.evaluate('__lr.view.plate.visible');page.mouse.up()
  assert json.loads(room('__lr.room.zones'))==[{'x':5,'z':0,'w':5,'d':6,'style':'checker'}]
  assert room('__lr.room.items.map(i=>i.c)')=='[2,3]','zone painting never recolours furniture'
  page.get_by_role('button',name='Wall colour',exact=True).click();page.locator('#row .dot',has_text='Navy').click();page.mouse.click(*at(5,0,4))
  page.get_by_role('button',name='Walls',exact=True).click();page.locator('#row .swatch',has_text='Brick').first.click();page.mouse.click(*at(0,5,4))
  assert json.loads(room('__lr.room.walls'))==[{'style':'paint','color':8},{'style':'brick','color':0},None,None]
  assert room('__lr.room.wall')=='{"style":"paint","color":0}'
  # Undo twice, redo twice; a fresh change clears redo.
  page.keyboard.press('Control+z');page.keyboard.press('Control+z');assert room('__lr.room.walls||null')=='null';assert page.locator('#bRedo').is_visible()
  page.click('#bRedo');page.keyboard.press('Control+Shift+z');assert json.loads(room('__lr.room.walls'))[1]=={'style':'brick','color':0};assert page.locator('#bRedo').is_hidden()
  page.keyboard.press('Control+z');assert page.locator('#bRedo').is_visible()
  page.click('#bZoneReset');assert room('[__lr.room.walls||null,__lr.room.zones]')=='[null,[]]';assert page.locator('#bRedo').is_hidden();assert page.locator('#bZoneReset').count()==0
  page.keyboard.press('Control+z');assert json.loads(room('__lr.room.zones'))[0]['style']=='checker'
  page.click('#bZones');assert page.locator('#bZones').get_attribute('aria-pressed')=='false'
  # View: two new places, the backdrop repaints, and the chip turns it off.
  page.get_by_role('button',name='View',exact=True).click();assert page.locator('#row .swatch').count()==6
  page.locator('#row .swatch',has_text='Laurentians').click();page.wait_for_function('__lr.view.env.view==="laurentians"');page.wait_for_timeout(500)
  assert ink()[2]!=city[2],'the backdrop follows the view'
  page.click('#bBackdrop');page.wait_for_function('document.querySelector("#backdrop").hidden');assert page.evaluate('__lr.meta.backdrop')==False
  page.click('#bBackdrop');page.wait_for_function('!document.querySelector("#backdrop").hidden')
  # Eyedropper: tap the bed to place more like it, same colour.
  page.click('.tools [data-tool="pick"]');page.mouse.click(*at(1,1.5,0.7))
  assert room('[__lr.state.tool,__lr.state.add,__lr.state.addC,__lr.state.group]')=='["add","bed",2,"furniture"]'
  assert page.locator('.tools [data-tool="add"]').evaluate('e=>e.classList.contains("on")')
  page.mouse.click(*at(4.5,8.5));assert room('__lr.room.items.filter(i=>i.t==="bed").map(i=>i.c)')=='[2,2]'
  page.locator('#row .swatch[data-furniture="sofa"]').click();assert page.evaluate('__lr.state.addC')==0,'the tray starts from the first colour again'
  # Hidden walls: the shell drops, partitions tuck away, and it all comes back.
  shown=lambda:page.evaluate('__lr.view.objs.get(2).visible')
  assert page.evaluate('__lr.view.mask')>0 and shown()
  page.click('#bWalls');page.wait_for_function('__lr.view.mask===0');assert not shown();assert page.locator('#bWalls').get_attribute('aria-pressed')=='true';assert page.locator('#bWalls').get_attribute('aria-label')=='Show walls'
  assert page.evaluate('__lr.view.objs.get(1).visible'),'furniture stays'
  page.click('#bWalls');page.wait_for_function('__lr.view.mask>0');assert shown();assert page.locator('#bWalls').get_attribute('aria-label')=='Hide walls'
  # Everything painted survives a reload of the saved draft.
  page.evaluate('__lr.room.paintWall(2,{color:5});__lr.changed()');saved=room('__lr.room.serialize()')
  assert '"zones"' in saved and '"walls"' in saved;copy=page.evaluate('s=>{const r=new LR.Room();r.restore(s);return r.snapshot();}',saved);assert copy==saved
  assert not errors,errors
  context.close()
 browser.close()
print('zones browser checks passed')
