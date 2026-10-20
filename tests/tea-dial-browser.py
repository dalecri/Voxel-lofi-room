"""npm run build && python3 tests/tea-dial-browser.py. Tea focus dial, native keyboard selection and a real-time background steep."""
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
 context.add_init_script("const OriginalDate=Date;window.__clock=Number(sessionStorage.getItem('teaClock')||new OriginalDate('2026-10-16T14:00:00').getTime());window.Date=class extends OriginalDate{constructor(...a){super(...(a.length?a:[window.__clock]))}static now(){return window.__clock}}")
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 page.evaluate("const a=__lr;a.room.items=[];a.room.n=10;const k=a.room.add(a.room.make('kettle',{x:3,z:3}));a.changed();window.tapTea=()=>a.interact(k.id);window.teaEffects={chime:0,sip:0};for(const [key,label] of [['ritualChime','chime'],['sip','sip']]){const original=a.Sound[key].bind(a.Sound);a.Sound[key]=(...args)=>{teaEffects[label]++;return original(...args)}};tapTea()")
 body=page.locator('#sheetBody');dial=page.locator('.tea-dial');slider=page.get_by_role('slider',name='Tea steep length',exact=True);focus=page.locator('.tea-focus');action=page.locator('.tea-start');arc=page.locator('[data-tea-arc]');mascot=page.locator('.tea-mascot')
 assert body.locator('h2').inner_text()=='Tea';assert page.get_by_role('combobox').count()==0;assert action.inner_text()=='Brew tea';assert mascot.get_attribute('data-state')=='calm';assert page.get_by_role('timer').inner_text()=='3 MINS'
 import math
 for minute in range(1,11):
  box=dial.bounding_box();angle=minute/10*math.pi*2;page.mouse.click(box['x']+box['width']/2+math.sin(angle)*box['width']*.46,box['y']+box['height']/2-math.cos(angle)*box['height']*.46);assert slider.input_value()==str(minute)
 for label,minute in [('Green tea · 2 min',2),('Black tea · 3 min',3),('Herbal · 5 min',5)]:
  page.get_by_role('button',name=label,exact=True).click();assert slider.input_value()==str(minute);assert page.get_by_role('timer').inner_text()==str(minute)+' MINS'
 slider.focus();page.keyboard.press('ArrowRight');assert slider.input_value()=='6';page.keyboard.press('Home');assert slider.input_value()=='1';page.keyboard.press('End');assert slider.input_value()=='10'
 box=dial.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']*.04);page.mouse.down();angle=4/10*math.pi*2;page.mouse.move(box['x']+box['width']/2+math.sin(angle)*box['width']*.46,box['y']+box['height']/2-math.cos(angle)*box['height']*.46,steps=6);page.mouse.up();assert slider.input_value()=='4'
 box=dial.bounding_box();angle=2/10*math.pi*2;page.mouse.click(box['x']+box['width']/2+math.sin(angle)*box['width']*.46,box['y']+box['height']/2-math.cos(angle)*box['height']*.46);assert slider.input_value()=='2'
 page.get_by_role('button',name='Brew tea',exact=True).click();assert page.evaluate('__lr.roomTools.tea.minutes')==2;assert focus.get_attribute('data-tea-state')=='brewing';assert mascot.get_attribute('data-state')=='watching';assert page.get_by_role('button',name='Cancel steep',exact=True).is_visible();assert slider.is_disabled();assert float(arc.get_attribute('data-progress'))==0
 image=mascot.locator('img').get_attribute('src');page.evaluate('window.__clock+=61000;__lr.roomToolsUI.tick(true)');assert page.get_by_role('timer').inner_text()=='0:59';assert .5<float(arc.get_attribute('data-progress'))<.52
 page.keyboard.press('Escape');page.evaluate("sessionStorage.setItem('teaClock',String(__clock))");page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.roomTools.remaining')==59000
 page.evaluate('window.__clock+=60000;window.teaChimes=0;const original=__lr.Sound.ritualChime.bind(__lr.Sound);__lr.Sound.ritualChime=()=>{teaChimes++;original()};__lr.roomToolsUI.tick(true);__lr.roomToolsUI.tick(true)');assert page.evaluate('teaChimes')==1
 page.evaluate("__lr.roomToolsUI.open('tea')");assert focus.get_attribute('data-tea-state')=='ready';assert float(arc.get_attribute('data-progress'))==1;assert mascot.get_attribute('data-state')=='happy';assert mascot.locator('img').get_attribute('src')!=image;assert page.locator('.tea-note').inner_text()=='Your tea is ready.';assert page.get_by_role('button',name='Enjoy the tea',exact=True).is_visible()
 for width,height in [(320,568),(390,700),(390,844),(1280,900),(844,390)]:
  page.set_viewport_size({'width':width,'height':height});body.evaluate('e=>e.scrollTop=0')
  controls=page.locator('.tea-top > *').evaluate_all('es=>es.map(e=>{const r=e.getBoundingClientRect();return {y:r.y+r.height/2,left:r.left,right:r.right}})');assert len(controls)==3;assert max(r['y'] for r in controls)-min(r['y'] for r in controls)<1
  assert all(controls[i]['right']<=controls[i+1]['left'] for i in range(2));assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');assert body.evaluate('e=>e.scrollHeight<=e.clientHeight+1'),(width,height,body.evaluate('e=>[e.scrollHeight,e.clientHeight,getComputedStyle(e).paddingBottom]'),focus.locator(':scope > *').evaluate_all('es=>es.map(e=>[e.className,e.getBoundingClientRect().height,getComputedStyle(e).margin])'))
  page.screenshot(path=f'/tmp/tea-compact-{width}-{height}.png')
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});body.evaluate('e=>e.scrollTop=0');assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');a=action.bounding_box();m=mascot.bounding_box();assert a['x']+a['width']<=m['x'];assert not page.locator('#timerBadges').is_visible();page.screenshot(path=f'/tmp/tea-dial-{phase}-{width}.png')
 page.get_by_role('button',name='Enjoy the tea',exact=True).click();assert page.evaluate('__lr.roomTools.tea.status')=='done';assert mascot.get_attribute('data-state')=='calm';assert action.inner_text()=='Brew tea'
 tune=page.get_by_role('button',name='♫ Tune in',exact=True);tune.click();assert page.evaluate('__lr.meta.music && __lr.meta.station===0');assert tune.get_attribute('aria-pressed')=='true';tune.click();assert not page.evaluate('__lr.meta.music')
 page.get_by_role('button',name='Herbal · 5 min',exact=True).click();page.get_by_role('button',name='Brew tea',exact=True).click();page.get_by_role('button',name='Cancel steep',exact=True).click();assert page.evaluate('__lr.roomTools.tea') is None;assert action.inner_text()=='Brew tea'
 page.emulate_media(reduced_motion='reduce');assert page.locator('.tea-steam i').first.evaluate('e=>getComputedStyle(e).animationName')=='none';assert not errors,errors
 print('PASS kettle tea dial 1–10, presets and keyboard, progress/locked controls, background and reload deadline, one ready chime, stateful mascot, enjoy/cancel, Tune in, reduced motion and mobile/desktop day/night',flush=True);browser.close()
server.shutdown()
